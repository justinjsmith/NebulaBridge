import json
import os
import boto3
import base64
import jwt
from jwt.algorithms import RSAAlgorithm
import urllib.request
import time

cognito = boto3.client('cognito-idp')

jwks_cache = {}
jwks_cache_time = 0
CACHE_DURATION = 3600  # 1 hour

def get_cognito_public_keys(region, user_pool_id):
    """Fetch and cache Cognito public keys for JWT verification"""
    global jwks_cache, jwks_cache_time
    
    current_time = time.time()
    if jwks_cache and current_time - jwks_cache_time < CACHE_DURATION:
        return jwks_cache
    
    keys_url = f'https://cognito-idp.{region}.amazonaws.com/{user_pool_id}/.well-known/jwks.json'
    with urllib.request.urlopen(keys_url) as response:
        keys = json.loads(response.read())
        jwks_cache = keys
        jwks_cache_time = current_time
        return keys

def verify_cognito_token(token, region, user_pool_id):
    """Verify the Cognito JWT token"""
    try:
        header = jwt.get_unverified_header(token)
        kid = header['kid']
        
        keys = get_cognito_public_keys(region, user_pool_id)
        
        key = None
        for k in keys['keys']:
            if k['kid'] == kid:
                key = k
                break
        
        if not key:
            return False, "Public key not found"
        
        public_key = RSAAlgorithm.from_jwk(json.dumps(key))
        
        payload = jwt.decode(
            token,
            public_key,
            algorithms=['RS256'],
            options={"verify_exp": True},
            audience=os.environ.get('COGNITO_APP_CLIENT_ID')
        )
        
        return True, payload
    except Exception as e:
        return False, str(e)

def lambda_handler(event, context):
    """
    AWS Lambda function that processes input text and returns a response.
    
    For GET requests: Returns a default greeting message.
    For POST requests: Prepends a message to the input text and returns it.
    
    Parameters:
    event (dict): Event data
    context (LambdaContext): Runtime information
    
    Returns:
    dict: API Gateway response with status code and body
    """
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
    }
    
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({})
        }
    
    auth_header = event.get('headers', {}).get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return {
            'statusCode': 401,
            'headers': headers,
            'body': json.dumps({
                'message': 'Unauthorized: Missing or invalid token'
            })
        }
    
    token = auth_header.split(' ')[1]
    region = os.environ.get('AWS_REGION', 'us-east-1')
    user_pool_id = os.environ.get('COGNITO_USER_POOL_ID')
    
    if not user_pool_id:
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({
                'message': 'Server configuration error: Missing Cognito User Pool ID'
            })
        }
    
    is_valid, payload_or_error = verify_cognito_token(token, region, user_pool_id)
    if not is_valid:
        return {
            'statusCode': 401,
            'headers': headers,
            'body': json.dumps({
                'message': f'Unauthorized: Invalid token - {payload_or_error}'
            })
        }
    
    if event.get('httpMethod') == 'POST' and event.get('body'):
        try:
            body = json.loads(event.get('body', '{}'))
            input_text = body.get('text', '')
            
            username = payload_or_error.get('username', 'User')
            
            response_message = f"NebulaBridge received your message: {input_text}"
            
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({
                    'message': response_message,
                    'user': username
                })
            }
        except Exception as e:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({
                    'message': f'Error processing request: {str(e)}'
                })
            }
    
    return {
        'statusCode': 200,
        'headers': headers,
        'body': json.dumps({
            'message': 'Hello from NebulaBridge Lambda function! Send a POST request with text to process it.',
            'user': payload_or_error.get('username', 'User')
        })
    }
