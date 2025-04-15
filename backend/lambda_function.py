import json

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
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
    }
    
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({})
        }
    
    if event.get('httpMethod') == 'POST' and event.get('body'):
        try:
            body = json.loads(event.get('body', '{}'))
            input_text = body.get('text', '')
            
            response_message = f"NebulaBridge received your message: {input_text}"
            
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({
                    'message': response_message
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
            'message': 'Hello from NebulaBridge Lambda function! Send a POST request with text to process it.'
        })
    }
