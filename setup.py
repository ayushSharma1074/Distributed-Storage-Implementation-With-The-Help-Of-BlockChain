# setup.py

# used for setting up the javascript server.

import json
import os

# create the json for managing files and permissions, directory system 
manager = open("metatree.json", "w")
json.dump([], manager)
manager.close()

# set up a file for populating buckets used for storage.
keyfilepath = "keyfiles"
bucketfile = "bucketlist.json"
os.mkdir(keyfilepath)
bucketlist = open(bucketfile, "w")
buckets = []
json.dump(buckets, bucketlist)
bucketlist.close()
