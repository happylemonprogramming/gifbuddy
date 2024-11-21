import requests
import json
import uuid
from datetime import datetime
import os, logging

strikeapikey = os.environ.get('strikeapikey')

def generate_invoice_id():
    """
    Generates a unique invoice ID using the current date/time and a unique identifier
    """
    now = datetime.now().strftime("%Y%m%d%H%M%S")  # format current date/time
    uid = str(uuid.uuid4().hex.upper()[0:6])  # generate unique identifier
    invoice_id = f"{now}-{uid}"  # combine date/time and identifier
    return invoice_id

def lightning_invoice(amount, description):
  # Create a new invoice
  url = "https://api.strike.me/v1/invoices"

  payload = json.dumps({
    "correlationId": generate_invoice_id(),#</= 40 characters
    "description": description, #</= 200 characters
    "amount": {
      "currency": "USD", # [BTC, USD, EUR, USDT, GBP]
      "amount": amount #for testing purposes
    }
  })
  headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': f'Bearer {strikeapikey}'
  }

  response = requests.request("POST", url, headers=headers, data=payload)
  logging.info(f"Strike invoice response: {response.json()}")
  invid = response.json()['invoiceId']
  return invid

# Function to generate lightning address
def lightning_quote(amount, description):
  invid = lightning_invoice(amount, description)
  # insert invoice id here
  url = "https://api.strike.me/v1/invoices/"+invid+"/quote" 

  payload={}
  headers = {
    'Accept': 'application/json',
    'Content-Length': '0',
    'Authorization': f'Bearer {strikeapikey}'
  }

  response = requests.request("POST", url, headers=headers, data=payload)
  logging.info(f"Strike quote response: {response.json()}")
  lninv = response.json()['lnInvoice']
  conv_rate = response.json()['conversionRate']['amount']
  return lninv, conv_rate, invid


def invoice_status(invoiceId):

  url = f"https://api.strike.me/v1/invoices/{invoiceId}"
  payload={}
  headers = {
    'Accept': 'application/json',
    'Authorization': f'Bearer {strikeapikey}'
  }

  response = requests.request("GET", url, headers=headers, data=payload)
  status = response.json()['state']
  return status


def exchange_rate():

  url = "https://api.strike.me/v1/rates/ticker"
  payload={}
  headers = {
    'Accept': 'application/json',
    'Authorization': f'Bearer {strikeapikey}'
  }

  response = requests.request("GET", url, headers=headers, data=payload)

  return response.json()[0]['amount']


if __name__ == '__main__':
  exchange_rate()