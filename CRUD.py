import json
import boto3
from decimal import Decimal
from datetime import datetime

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('<Sua tabela Dynamondb>')

def convert_decimals(obj):
    if isinstance(obj, Decimal):
        return float(obj)
    if isinstance(obj, dict):
        return {k: convert_decimals(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [convert_decimals(v) for v in obj]
    return obj

def respond(status_code, body):
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
            'Access-Control-Allow-Headers': '*'
        },
        'body': json.dumps(convert_decimals(body), default=str)
    }

def lambda_handler(event, context):
    http_method = event['requestContext']['http']['method']
    path = event['rawPath'].replace('/prod', '', 1)
    
    # OPTIONS (CORS preflight)
    if http_method == 'OPTIONS':
        return respond(200, {})

    # POST /produtos
    if http_method == 'POST' and path == '/produtos':
        body = json.loads(event.get('body') or '{}')
        for f in ('id','nome','preco','quantidade'):
            if f not in body:
                return respond(400, {'erro': f'{f} é obrigatório'})
        if table.get_item(Key={'id': body['id']}).get('Item'):
            return respond(409, {'erro': f"ID {body['id']} já existe"})
        item = {
            'id': body['id'],
            'nome': body['nome'],
            'preco': Decimal(str(body['preco'])),
            'quantidade': int(body['quantidade']),
            'data_criacao': datetime.utcnow().isoformat()
        }
        table.put_item(Item=item)
        return respond(201, {'mensagem':'Produto criado','dados':item})

    # GET /produtos
    if http_method == 'GET' and path == '/produtos':
        resp = table.scan()
        return respond(200, {'produtos': resp.get('Items', [])})

    # GET /produtos/{id}
    if http_method == 'GET' and path.startswith('/produtos/'):
        pid = event['pathParameters']['id']
        resp = table.get_item(Key={'id': pid})
        if 'Item' not in resp:
            return respond(404, {'erro':'Produto não encontrado'})
        return respond(200, resp['Item'])

    # PUT /produtos/{id}
    if http_method == 'PUT' and path.startswith('/produtos/'):
        pid = event['pathParameters']['id']
        body = json.loads(event.get('body') or '{}')
        upds, vals = [], {}
        for k,v in body.items():
            if k in ('nome','preco','quantidade'):
                upds.append(f"{k}=:{k}")
                vals[f":{k}"] = Decimal(str(v)) if k=='preco' else (int(v) if k=='quantidade' else v)
        if not upds:
            return respond(400, {'erro':'Nenhum campo válido para atualizar'})
        resp = table.update_item(
            Key={'id': pid},
            UpdateExpression='SET ' + ','.join(upds),
            ExpressionAttributeValues=vals,
            ReturnValues='ALL_NEW'
        )
        return respond(200, resp['Attributes'])

    # DELETE /produtos/{id}
    if http_method == 'DELETE' and path.startswith('/produtos/'):
        pid = event['pathParameters']['id']
        table.delete_item(Key={'id': pid})
        return respond(200, {'mensagem':'Produto excluído'})

    return respond(400, {'erro':'Método ou rota não suportada'})