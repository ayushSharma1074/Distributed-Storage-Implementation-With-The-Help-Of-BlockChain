from bridge import *
import sys

# To run a test:
# python testdriver.py [1|2|3|4] [none|filename|filename|filename] [none|file|none|none]

argv = sys.argv

ip = "35.194.62.230"
port = "3125"

set_connection(ip, port)

# user identity
pub_addr_id = 0xb87854FbbC2f5865855C6193f34AC389e6aCbF10
prikey = 0xce887c6fc788628ebe74e5b2dbec1ea24c35802bc5bc3108cdb346a9af81178a

def test_add_user():
    res = add_user(pub_addr_id, prikey)
    print(f"[add user] Functionality returns {res}")

def test_upload_file(filename, contents):
    with open(filename, "w") as file:
        file.write(contents)
    file = open(filename, "r")
    res = upload_file(pub_addr_id, prikey, filename, file)
    file.close()
    print(f"[upload file] Functionality returns {res}")

def test_download_file(filename):
    res = download_file(pub_addr_id, prikey, filename)
    print(f"[download file] Functionality returns {res}")

def test_delete_file(filename):
    res = delete_file(pub_addr_id, prikey, filename)
    print(f"[delete file] Functionality returns {res}")

funcmap = {"1":test_add_user, "2":test_upload_file, "3":test_download_file, "4":test_delete_file}
try:
    if(argv[1]=="1"):
        funcmap["1"]()
    elif(argv[1]=="2"):
        funcmap["2"](argv[2], argv[3])
    elif(argv[1]=="3"):
        funcmap["3"](argv[2])
    elif(argv[1]=="4"):
        funcmap["4"](argv[2])

except Exception as err:
    print(f"Something goofed!\n>>>\n{err}\n<<<\n")


