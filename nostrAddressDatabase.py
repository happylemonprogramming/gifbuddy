import boto3
from botocore.exceptions import NoCredentialsError
import os, time

# Environment variables
awssecret = os.environ["AWS_SECRET_ACCESS_KEY"]
awsaccess = os.environ["AWS_ACCESS_KEY_ID"]

def save_to_dynamodb(name, pubkey):
    try:
        dynamodb = boto3.resource('dynamodb', region_name='us-west-1', aws_access_key_id=awsaccess,
                                  aws_secret_access_key=awssecret)

        # specify your table name
        table = dynamodb.Table('nostr_addresses')

        # insert data into the table
        response = table.put_item(
           Item={
                'name': name,
                'pubkey': pubkey,
           }
        )

        print("Put Item succeeded")

    except NoCredentialsError:
        print("No AWS Credentials were found.")

def get_from_dynamodb(name):
    dynamodb = boto3.resource('dynamodb', region_name='us-west-1')
    table = dynamodb.Table('nostr_addresses')

    try:
        response = table.get_item(
            Key={
                'name': name
            }
        )

    except:
        print('error')
        
    else:
        return response['Item']

def update_dynamodb(name, key, value):
    begin = time.time()
    try:
        dynamodb = boto3.resource('dynamodb', region_name='us-west-1', aws_access_key_id=awsaccess,
                                  aws_secret_access_key=awssecret)

        # specify your table name
        table = dynamodb.Table('nostr_addresses')

        # update data in the table
        response = table.update_item(
           Key={
                'name': name,
            },
            UpdateExpression='SET #k = :v',
            ExpressionAttributeNames={
                '#k' : key
            },
            ExpressionAttributeValues={
                ':v' : value
            }
        )

        print("Update Item succeeded")

    except NoCredentialsError:
        print("No AWS Credentials were found.")
    
    finish = time.time()-begin
    print("Database Update Time:", finish)

def scan_table():
    dynamodb = boto3.resource('dynamodb', region_name='us-west-1', aws_access_key_id=awsaccess,
                                aws_secret_access_key=awssecret)
    # specify your table name
    table = dynamodb.Table('nostr_addresses')

    response = table.scan()
    return response.get('Items', [])

if __name__ == '__main__':
    # hexhomies = {'TheFishcake': '8fb140b4e8ddef97ce4b821d247278a1a4353362623f64021484b372f948000c', 'NotBiebs': '604e96e099936a104883958b040b47672e0f048c98ac793f37ffe4c720279eb2', 'DontBelieveTheHype': '99bb5591c9116600f845107d31f9b59e2f7c7e09a1ff802e84f1d43da557ca64', 'Karnage': '1bc70a0148b3f316da33fe3c89f23e3e71ac4ff998027ec712b905cd24f6a411', 'NunyaBidness': '6389be6491e7b693e9f368ece88fcd145f07c068d2c1bbae4247b9b5ef439d32', 'DerekRoss': '3f770d65d3a764a9c5cb503ae123e62ec7598ad035d836e2a810f3877a745b24', 'SUPERMAX': 'ae1008d23930b776c18092f6eab41e4b09fcf3f03f3641b1b4e6ee3aa166d760', 'beejay': 'c3ae4ad8e06a91c200475d69ca90440d6d54de729d3d1e5afacfbdb6e54d46cb', 'SPA': '4a38463c2a75e68c24416e7720a3b3befbb0ea6872d5a04692c39e18e8f2dcac', 'djmeistro': '1e067bfb58820576df3daf7cb051d4411b80a0b8fa12fc253cd0ab41cf1a2069'}
    hexhomies = {'DAVE': '26e9ab7f2c8d2ac37903af90be2a1aef6f2acbd699f4f259caac7ad33d2000c1'}
    for name, pubkeyhex in hexhomies.items():
        save_to_dynamodb(name, pubkeyhex)
    print(scan_table())
    
    # homies = {'TheFishcake': 'npub137c5pd8gmhhe0njtsgwjgunc5xjr2vmzvglkgqs5sjeh972gqqxqjak37w', 'NotBiebs': 'npub1vp8fdcyejd4pqjyrjk9sgz68vuhq7pyvnzk8j0ehlljvwgp8n6eqsrnpsw', 'DontBelieveTheHype': 'npub1nxa4tywfz9nqp7z9zp7nr7d4nchhclsf58lcqt5y782rmf2hefjquaa6q8', 'Karnage': 'npub1r0rs5q2gk0e3dk3nlc7gnu378ec6cnlenqp8a3cjhyzu6f8k5sgs4sq9ac', 'NunyaBidness': 'npub1vwymuey3u7mf860ndrkw3r7dz30s0srg6tqmhtjzg7umtm6rn5eq2qzugd', 'DerekRoss': 'npub18ams6ewn5aj2n3wt2qawzglx9mr4nzksxhvrdc4gzrecw7n5tvjqctp424', 'SUPERMAX': 'npub14cgq353exzmhdsvqjtmw4dq7fvyleuls8umyrvd5umhr4gtx6asq7hqjhl', 'beejay': 'npub1cwhy4k8qd2guyqz8t45u4yzyp4k4fhnjn573ukh6e77mde2dgm9s2lujc5', 'SPA': 'npub1fguyv0p2whngcfzpdemjpganhmamp6ngwt26q35jcw0p368jmjkqy27896', 'djmeistro': 'npub1rcr8h76csgzhdhea4a7tq5w5gydcpg9clgf0cffu6z45rnc6yp5sj7cfuz'}
    # hexhomies = {'TheFishcake': '8fb140b4e8ddef97ce4b821d247278a1a4353362623f64021484b372f948000c', 'NotBiebs': '604e96e099936a104883958b040b47672e0f048c98ac793f37ffe4c720279eb2', 'DontBelieveTheHype': '99bb5591c9116600f845107d31f9b59e2f7c7e09a1ff802e84f1d43da557ca64', 'Karnage': '1bc70a0148b3f316da33fe3c89f23e3e71ac4ff998027ec712b905cd24f6a411', 'NunyaBidness': '6389be6491e7b693e9f368ece88fcd145f07c068d2c1bbae4247b9b5ef439d32', 'DerekRoss': '3f770d65d3a764a9c5cb503ae123e62ec7598ad035d836e2a810f3877a745b24', 'SUPERMAX': 'ae1008d23930b776c18092f6eab41e4b09fcf3f03f3641b1b4e6ee3aa166d760', 'beejay': 'c3ae4ad8e06a91c200475d69ca90440d6d54de729d3d1e5afacfbdb6e54d46cb', 'SPA': '4a38463c2a75e68c24416e7720a3b3befbb0ea6872d5a04692c39e18e8f2dcac', 'djmeistro': '1e067bfb58820576df3daf7cb051d4411b80a0b8fa12fc253cd0ab41cf1a2069'}
 