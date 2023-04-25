# providers.py

# This script is used to append or remove a new provider that registers
# with the system. When a bucket is being registered with the cloud
# file manager, they will need to provide:
# (ProjectID, keyfile-path)
# we need to add this information to bucketlist.json

# usage:
# python3 providers.py <append|remove> <provider public address> <project> <bucket number>  <keyfile path|null>

import json
import sys
import io
from google.cloud import storage
from google.oauth2 import service_account

bucketlist = "bucketlist.json"
argv = sys.argv

def create_bucket_metadata(project, bucket_num, keyfile_path):
    filename = f"__metadata-users__.json"
    key_credentials = service_account.Credentials.from_service_account_file(keyfile_path)
    client = storage.Client(project=project, credentials=key_credentials)
    bucket = client.bucket(bucket_num)
    blob = bucket.blob(filename)
    datastruct = {
                    "project":project,
                    "bucket":bucket_num,
                    "files":{}
                    }
    blob.upload_from_file(io.StringIO(json.dumps(datastruct)))
    

def append_provider(sargv):
    # retrieve the google cloud project and the bucket identifier
    # as well as the keypath to allow permission for access accounts
    jfile = open(bucketlist, 'r')
    provider_id = sargv[2]
    project = sargv[3]
    bucket_num = sargv[4]
    keyfile_path = sargv[5]
    print(f"Appending ({provider_id}, {project}, {bucket_num}, {keyfile_path})")
    create_bucket_metadata(project, bucket_num, keyfile_path)
    # load the bucket list file
    jdata = json.load(jfile)
    print(f"Test jdata is : {jdata}")
    # create a new provider entry
    # NOTE: "free" keeps track of free space. We want to subtract this number whenever adding a file, and add when freeing.
    provider_new = {"provider":provider_id, "project":project, "bucket":bucket_num, "keyfile":keyfile_path}
    # add the new provider (of cloud disk storage) and save the file
    jdata.append(provider_new)
    print(f"jdata is now: {jdata}")
    jfile.close()
    jfile = open(bucketlist, 'w')
    json.dump(jdata, jfile, indent=4)
    jfile.close()
    

def remove_provider(sargv):
    # retrieve the google cloud project and the bucket identifier
    jfile = open(bucketlist, 'r')
    provider_id = sargv[2]
    project = sargv[3]
    bucket_num = sargv[4]
    # load the bucket list file
    jdata = json.load(jfile)
    # find the entry if it exists, and remove it
    for jentry in jdata:
        if(jentry["provider"]==provider_id and jentry["project"]==project and jentry["bucket"]==bucket_num):
            jdata.remove(jentry)
            break
    # save the file
    jfile.close()
    jfile = open(bucketlist, 'w')
    json.dump(jdata, jfile)
    jfile.close()

funcs = {"append":append_provider,
         "remove":remove_provider}
   
try:
    print(f"Debug: opening the file bucketlist")
    cmd = argv[1]
    print(f"The command is {cmd}")
    funcs[cmd](argv)
except Exception as err:
    print(f"Failed to run the command! {err}")
