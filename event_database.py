import boto3
from botocore.exceptions import NoCredentialsError
import os, time

# Environment variables
awssecret = os.environ["AWS_SECRET_ACCESS_KEY"]
awsaccess = os.environ["AWS_ACCESS_KEY_ID"]

def save_to_dynamodb(pubkey, api_key, created_at, expires_at, is_active):
    begin = time.time()
    try:
        dynamodb = boto3.resource('dynamodb', region_name='us-west-1', aws_access_key_id=awsaccess,
                                  aws_secret_access_key=awssecret)

        # specify your table name
        table = dynamodb.Table('gifbuddy_api')

        # insert data into the table
        response = table.put_item(
           Item={
                'pubkey': pubkey,
                'api_key': api_key,
                'created_at': created_at,
                'expires_at': expires_at,
                'is_active': is_active
           }
        )

        print("Put Item succeeded")

    except NoCredentialsError:
        print("No AWS Credentials were found.")
    finish = time.time()-begin
    # print("Database Save Time:", finish)

def get_from_dynamodb(eventID):
    dynamodb = boto3.resource('dynamodb', region_name='us-west-1')
    table = dynamodb.Table('gifbuddy_api')
    # print(table)

    try:
        response = table.get_item(
            Key={
                'eventID': eventID
            }
        )

    except:
        print('error')
        
    else:
        return response['Item']

def update_dynamodb(eventID, updates):
    begin = time.time()
    try:
        dynamodb = boto3.resource('dynamodb', region_name='us-west-1', aws_access_key_id=awsaccess,
                                  aws_secret_access_key=awssecret)

        # specify your table name
        table = dynamodb.Table('gifbuddy_api')

        # Dynamically build UpdateExpression, ExpressionAttributeNames, and ExpressionAttributeValues
        update_expression = 'SET ' + ', '.join([f'#k{i} = :v{i}' for i in range(len(updates))])
        expression_attribute_names = {f'#k{i}': key for i, (key, value) in enumerate(updates.items())}
        expression_attribute_values = {f':v{i}': value for i, (key, value) in enumerate(updates.items())}

        # update data in the table
        response = table.update_item(
            Key={
                'eventID': eventID,
            },
            UpdateExpression=update_expression,
            ExpressionAttributeNames=expression_attribute_names,
            ExpressionAttributeValues=expression_attribute_values
        )

        print("Update Item succeeded")

    except NoCredentialsError:
        print("No AWS Credentials were found.")

    finish = time.time() - begin
    print("Database Update Time:", finish)

def scan_table():
    dynamodb = boto3.resource('dynamodb', region_name='us-west-1', aws_access_key_id=awsaccess,
                                aws_secret_access_key=awssecret)
    # specify your table name
    table = dynamodb.Table('gifbuddy_api')

    response = table.scan()
    return response.get('Items', [])

if __name__ == '__main__':
    # eventID = '2'
    # pubkey_ref_list = 'pubkey_ref_list'
    # target_language = 'target_language'
    # replyID = 'replyID'
    # content_type = 'content_type'
    # quote = 'quote'
    # text = 'text'
    # media = 'media'
    # start = 'start'
    # end = 'end'
    # status = 'status'

    # save_to_dynamodb(eventID, pubkey_ref_list, target_language, replyID, content_type, quote, text, media, start, end, status)
    # item = get_from_dynamodb('ea1a7142d0974eb7eb2fcf0eff0fe16acd1c931fda909a57f38effe8828584a2')
    # print(item['text'],type(item['text']))
    # print(scan_table())
    update_dynamodb('f62bb7b8acfbce8e1f9d2d8373bbd8c0fec6144e8956fc76e1631a4a05dfd706', {'status': 'processing'})