# bridge.py
# script to provide some friendly interfaces to bridge the API.

import requests
import json
from web3 import Web3
from eth_account.messages import encode_defunct

url_path = None
web = Web3()

def set_connection(ip, port):
    global url_path
    url_path = f"http://{ip}:{port}/"

def delete_file(user_id, prikey, filename):
    url = url_path + "delete_file"
    signpackage = sign_message(int.from_bytes(filename.encode(), 'big'), prikey)
    filehash = signpackage[0]
    sign_v, sign_r, sign_s = signpackage[1]

    # pad the hex values
    user_id_hex = "0x" + (40-len(hex(user_id)[2:]))*"0" + hex(user_id)[2:]
    filehash_hex = filehash.hex()
    v_hex = "0x" + (2-len(hex(sign_v)[2:]))*"0" + hex(sign_v)[2:]
    r_hex = "0x" + (64-len(hex(sign_r)[2:]))*"0" + hex(sign_r)[2:]
    s_hex = "0x" + (64-len(hex(sign_s)[2:]))*"0" + hex(sign_s)[2:]

    print(f"DEBUG: Trying to access URL {url}")
    headers = {"Content-Type": "application/json"}
    data = {
        "metadata": {
            "id": user_id_hex,
            "filename": filename,
            "filehash": filehash_hex,
            "sign_v": v_hex,
            "sign_r": r_hex,
            "sign_s": s_hex
        }
    }

    payload = json.dumps(data)
    print(f"Sending the the payload:\n{payload}\n")
    res = requests.post(url, headers=headers, data=payload)
    return res

def download_file(user_id, prikey, filename):
    url = url_path + "download_file"
    signpackage = sign_message(int.from_bytes(filename.encode(), 'big'), prikey)
    filehash = signpackage[0]
    sign_v, sign_r, sign_s = signpackage[1]

    # pad the hex values
    user_id_hex = "0x" + (40-len(hex(user_id)[2:]))*"0" + hex(user_id)[2:]
    filehash_hex = filehash.hex()
    v_hex = "0x" + (2-len(hex(sign_v)[2:]))*"0" + hex(sign_v)[2:]
    r_hex = "0x" + (64-len(hex(sign_r)[2:]))*"0" + hex(sign_r)[2:]
    s_hex = "0x" + (64-len(hex(sign_s)[2:]))*"0" + hex(sign_s)[2:]

    print(f"DEBUG: Trying to access URL {url}")
    headers = {"Content-Type": "application/json"}
    data = {
        "metadata": {
            "id": user_id_hex,
            "filename": filename,
            "filehash": filehash_hex,
            "sign_v": v_hex,
            "sign_r": r_hex,
            "sign_s": s_hex
        }
    }

    payload = json.dumps(data)
    print(f"Sending the the payload:\n{payload}\n")
    res = requests.post(url, headers=headers, data=payload)
    return res

def upload_file(user_id, prikey, filename, file):
    # note filename should be string
    url = url_path + "upload_file"
    signpackage = sign_message(int.from_bytes(filename.encode(), 'big'), prikey)
    filehash = signpackage[0]
    sign_v, sign_r, sign_s = signpackage[1]
    
    # pad the hex value 
    user_id_hex = "0x" + (40-len(hex(user_id)[2:]))*"0" + hex(user_id)[2:]
    filehash_hex = filehash.hex()
    v_hex = "0x" + (2-len(hex(sign_v)[2:]))*"0" + hex(sign_v)[2:]
    r_hex = "0x" + (64-len(hex(sign_r)[2:]))*"0" + hex(sign_r)[2:]
    s_hex = "0x" + (64-len(hex(sign_s)[2:]))*"0" + hex(sign_s)[2:]

    
    print(f"DEBUG: Trying to access the URL {url}")
    headers = {"Content-Type": "application/json"}
    data = {
        "filecontent": file.read(),
        "metadata": {
            "id": user_id_hex,
            "filename": filename,
            "filehash": filehash_hex,
            "sign_v": v_hex,
            "sign_r": r_hex,
            "sign_s": s_hex
        }
    }
    
    payload = json.dumps(data)
    print(f"Sending the the payload:\n{payload}\n")
    res = requests.post(url, headers=headers, data=payload)
    return res

def add_user(user_id, prikey):
    # add a new user to the system - note: user_id should be int
    url = url_path + "add_user"
    print(f"DEBUG: Trying to access the URL {url}")
    signpackage = sign_message(user_id, prikey)
    user_id_hash = signpackage[0]
    sign_v, sign_r, sign_s = signpackage[1]

    user_id_hex = "0x" + (40-len(hex(user_id)[2:]))*"0" + hex(user_id)[2:]
    id_hash_hex = user_id_hash.hex()
    v_hex = "0x" + (2-len(hex(sign_v)[2:]))*"0" + hex(sign_v)[2:]
    r_hex = "0x" + (64-len(hex(sign_r)[2:]))*"0" + hex(sign_r)[2:]
    s_hex = "0x" + (64-len(hex(sign_s)[2:]))*"0" + hex(sign_s)[2:]
    

    headers = {"Content-Type": "application/json"}
    data = {
                "metadata": {
                    "id":user_id_hex,
                    "id_hash":id_hash_hex,
                    "sign_v":v_hex,
                    "sign_r":r_hex,
                    "sign_s":s_hex
                }
            }
    
    payload = json.dumps(data)
    print(f"Sending the the payload:\n{payload}\n")
    res = requests.post(url, headers=headers, data=payload)

    return res

def sign_message(message, prikey):
    # sign a message of choice from the user
    # expectation is that message is int
    account = web.eth.account.from_key(prikey)
    messagehex = hex(message)[2:]
    encoded_message = encode_defunct(hexstr=messagehex)
    signed = account.sign_message(encoded_message)

    v = signed.v
    r = signed.r
    s = signed.s
    signpackage = (signed.messageHash, (v, r, s))

     
    return signpackage


