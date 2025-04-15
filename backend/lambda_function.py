import json

def lambda_handler(event, context):
    """
    Simple AWS Lambda function that returns a greeting message.
    
    Parameters:
    event (dict): Event data
    context (LambdaContext): Runtime information
    
    Returns:
    dict: API Gateway response with status code and body
    """
    return {
        'statusCode': 200,
        'headers': {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
        },
        'body': json.dumps({
            'message': 'Hello from NebulaBridge Lambda function!'
        })
    }
