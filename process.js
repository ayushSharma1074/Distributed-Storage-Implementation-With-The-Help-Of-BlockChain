
const fs = require('fs');
const StandardMerkleTree = require( "@openzeppelin/merkle-tree");

const Web3 = require('web3');
const filesyscontrol = require("./filesyscontrol");
const googlebucket = require("./googlebucket")

const filename_accounts = "accounts.json";
const filename_disklist = "bucketlist.json"; 

const providerAddr = "https://eth-sepolia.g.alchemy.com/v2/m5xr5zKeM3WLGQL2l_pbLYkWwIhdAXl-";
const web3 = new Web3(providerAddr);
let key_str = fs.readFileSync('fileImports/temp_key.txt', 'ascii').replace('\r', '')
var keys = key_str.split('\n')
var privKey = keys[0];
var wallet = web3.eth.accounts.privateKeyToAccount(privKey);
var ownerAddr = wallet.address;

const fileAbiPath = "fileImports/filePermAbiLatest.json";
const fileAbi = JSON.parse(fs.readFileSync(fileAbiPath).toString());

const contractAddr = "0x0F83cEdbb4181DE42A59729ce788B6f8523E0DBb";
const contractAPI = new web3.eth.Contract(fileAbi, contractAddr);

/*Function: add a new user to the user json*/
async function insert_user(id, identifier){
	var successful_insert = await filesyscontrol.create_user_entry(id);
	return successful_insert;
}


// This function will create the merkle tree for user, and then make the call the the end to update/add the merkle tree in metadata as well as on the blockchain.
// updateUserHash is the contract function used for updating the blockchain data.
async function setUserMerkleData(userAddr,fileName,identifier)
{
var user_check=await getUserRootBC(userAddr)
console.log("Inside [setUserMerkleData], printing user root:", user_check)
var fileName_list=[]
var existing_file = await filesyscontrol.check_file_existence(userAddr, fileName);
if(existing_file===null || existing_file===undefined )
{
	merkle_json=await filesyscontrol.getMerkleTree(userAddr)
	if(merkle_json !== null && merkle_json!= undefined && merkle_json!== '')
	{
		const userTree=StandardMerkleTree.StandardMerkleTree.load(JSON.parse(merkle_json))
		for (const [i, v] of userTree.entries()) 
		{
			fileName_list.push(v)	
		}	
	}
	fileName_list.push([fileName])
	console.log(`[setUserMerkleData] Merkle tree is being built using  ${fileName_list}`)
	const tree=StandardMerkleTree.StandardMerkleTree.of(fileName_list,['string'])

	const root=tree.root
	console.log("[setUserMerkleData] merkle root:",root)
	await filesyscontrol.setMerkleTree(userAddr,tree)
	await updateUserHash(userAddr,root,identifier)
	
	
}
};	

async function   updateMerkleAfterDelete(userAddr,identifier,filename)
{
	var user_check=await getUserRootBC(userAddr)
	console.log("Inside [updateMerkleAfterDelete], printing user root:", user_check)
	var fileName_list=[]
	var root=''
	merkle_json=await filesyscontrol.getMerkleTree(userAddr)
	if(merkle_json !== null && merkle_json!= undefined && merkle_json!== '')
	{
		const userTree=StandardMerkleTree.StandardMerkleTree.load(JSON.parse(merkle_json))
		for (const [i, v] of userTree.entries()) 
		{
			if(v==filename)
			{
				continue
			}
			fileName_list.push(v)	
		}	
	}
	console.log(`[setUserMerkleData] Merkle tree is being built using  ${fileName_list}`)
	if(fileName_list.length==0)
	{
		root=0x0
		console.log("[setUserMerkleData] merkle root:",root)
		await filesyscontrol.setMerkleTree(userAddr,'')
		await updateUserHash(userAddr,root,identifier)
		return


	}
	const tree=StandardMerkleTree.StandardMerkleTree.of(fileName_list,['string'])
	
	root=tree.root
	console.log("[setUserMerkleData] merkle root:",root)
	await filesyscontrol.setMerkleTree(userAddr,tree)
	await updateUserHash(userAddr,root,identifier)

};

async function authenticate(addr, signatureObj){
	var authenticated = false;
	console.log(`[authenticate] authenticate: Taking in params ${addr}, ${JSON.stringify(signatureObj)}`);
	var ret_addr = await contractAPI.methods.VerifyMessage(signatureObj["hashedMessage"], signatureObj["v"], signatureObj["r"], signatureObj["s"]).call();
	// check if the user owns this account
	console.log("[authenticate] This is the authentication. This message should appear BEFORE the addUser function!");
	console.log(`[authenticate] Attempting authentication... ${addr} === ${ret_addr} ? ${parseInt(addr, 16)===parseInt(ret_addr, 16)}`);
	if(parseInt(addr, 16)===parseInt(ret_addr, 16)){
		authenticated = true;
	}
	console.log("[authenticate] ended: ",authenticated)
	return authenticated;
}

// function to deal with 1. updating metadata, and 2. saving the actual file
async function manage_upload(id, filename, filenamehash, filecontent){
	console.log(`[manage_upload] manage_upload called with parameters id ${id}, filename ${filename}, filecontent ${filecontent}`);
	var uploadable = true;
	var existing_file = await filesyscontrol.check_file_existence(id, filename);
	if(existing_file===null){
		// the file is new and so a new record needs to be inserted
		console.log(`[manage_upload] The file does not already exist, so we have to upload it as a new file!`);
		var replication_factor=2
		uploadable = await upload_new(id, filename,filenamehash,replication_factor,filecontent);
		//fs.writeFileSync(diskpath+"/"+filename, filecontent);
	} else {
		// the file is already in the system, so only need to save the file

		uploadable = await upload_existing(id,filename,filecontent);

		// existing_file is a file metadata object, which contains filename, diskpath, and collaborators etc.
		console.log(`[manage_upload] The file is not new, so we just need to save it again with no changes to metadata`);
		//fs.writeFileSync(diskpath+"/"+filename, filecontent);
	}
    console.log("[manage_upload] ended")
	return uploadable;
		
}

// This function handles the logic for downloading the file from buckets.
// If user has access, it tries to download the file from the first bucket in the list, if that bucket is not available it will go to the next bucket until it finds the file.
async function manageDownload(userAddr, filename){
	console.log("Inside manageDownload")
	var fileBuckets=await filesyscontrol.getFileBuckets(userAddr,filename)
	for(var i=0;i<fileBuckets.length;i++)
	{
		var bucket=fileBuckets[i]
		var bucket_name=bucket['bucket']
		var bucket_key=bucket['keyfile']
		var bucket_project_id=bucket["project"]
		var bucket_provider={
  			projectId: bucket_project_id,
  			keyFilename: bucket_key
		};
		if(googlebucket.gc_checkBucketStatus(bucket_name,bucket_provider))
		{
			data=await googlebucket.gc_readFile(bucket_name,userAddr,filename,bucket_provider)
			console.log("Download data",data)
			return data;
		}
		else
		{
			continue;
		}

	}
	console.log("File not available- None of the buckets had the file.")
};

// Verifies the user's access to download a file using merkle tree and root.
async function authenticateFileAccess(userAddr,filename)
{
	var TEST_MODE=false
	console.log("\n\n\n\n\n Insinde authenticateFileAccess, checking if in test:",TEST_MODE)
	if(TEST_MODE)
	{
		return true;
	}
	var bc_root=await getUserRootBC(userAddr)
	var root=web3.utils.numberToHex(bc_root['merkleHash'])
	root = web3.utils.padLeft(root, 64);
	console.log("Inside authenticateFileAccess, print root:",root)
	var merkle_json=await filesyscontrol.getMerkleTree(userAddr)
	const userTree=StandardMerkleTree.StandardMerkleTree.load(JSON.parse(merkle_json))
	for (const [i, v] of userTree.entries()) {
		if(v[0]==filename)
		{
			const proof = userTree.getProof(i);
			const isAuth=StandardMerkleTree.StandardMerkleTree.verify(root,['string'],[filename],proof)
			console.log("isAuth and filename and v ", isAuth, filename,v)
			return isAuth
		}
	}
	return false
};


		
async function upload_existing(userAddr,filename,fileContent){
	console.log("[upload_existing] started")
	var uploadable = true;
    var fileBuckets= await filesyscontrol.getFileBuckets(userAddr,filename)
	console.log(fileBuckets)
	var syncbuckets = [];
	var ver=null
	for(var i=0;i<fileBuckets.length;i++)
	{
		var bucket=fileBuckets[i];
		var bucket_name=bucket['bucket'];
		var bucket_key=bucket['keyfile'];
		var bucket_project_id=bucket["project"];
		var bucket_provider={
  			projectId: bucket_project_id,
  			keyFilename: bucket_key
		};

		try {
			// don't want to append file, so delete the old one and replace.
			console.log(`[upload_existing] attempting to upload a new file: id ${userAddr}, filename ${filename}`);
			uploadable = await googlebucket.gc_uploadFile(bucket_name,userAddr,filename,fileContent,bucket_provider);
			console.log("[upload_existing] ifUploaded the actual user file not the metadata: ", uploadable)
			syncbuckets.push(bucket);
			// change the version number since the file has been modified
			var filemetadata = await filesyscontrol.check_file_existence(userAddr, filename);
			filemetadata["version"] += 1;
			ver=filemetadata["version"]
			filemetadata["syncbuckets"] = syncbuckets;
			console.log(`[upload_existing] after updating the metadata, we get ${JSON.stringify(filemetadata)}\n`);
			await filesyscontrol.update_file_metadata(userAddr, filemetadata);
		} catch (err) {
			console.log(`[upload_existing] Failed to replace existing file... Error reason:\n ${err}`);
			uploadable = false;
		}

	}
	console.log(`[upload_existing] About to call version_updater to update gc buckets...`);
	if(ver!=null)
	{
		await version_updater(userAddr, syncbuckets,filename, ver);

	}
	console.log("[upload_existing] ended")
	return uploadable;

}

// note: we need to modify to include file ID. also edit filesyscontrol.create_file_entry()
async function upload_new(id, filename, filenamehash, replication_factor,filecontent) {
    // we now wish to store the file, we assume we are already authenticated.
    // two parts: first, generate disk. second, add the file to metatree.
    var uploadable=true
	console.log(`[upload_new] upload_new called, checking to update metadata...`);
    var diskbuckets = [];
	var syncbuckets = [];
    if (fs.existsSync(filename_disklist)) {
        // we get a list of disks (buckets) available to us specified in disklist
        var disklist_file = fs.readFileSync(filename_disklist)
        var disklist = JSON.parse(disklist_file);
        console.log(`[upload_new] Reading in disklist gives a result ${disklist} with length ${disklist.length}`);

        // shuffle the disklist and pick the first n entries
        disklist = shuffleArray(disklist);
        var n = Math.min(replication_factor, disklist.length);
        disklist = disklist.slice(0, n);

        // pick n buckets to store the file in
        for (var i = 0; i < disklist.length; i++) {
            var diskbucket = disklist[i];
			var bucket_name=diskbucket['bucket']
			var bucket_key=diskbucket['keyfile']
			var bucket_project_id=diskbucket["project"]
			var bucket_provider={
				projectId: bucket_project_id,
				keyFilename: bucket_key
			};
			
			try {
				await googlebucket.gc_uploadFile(bucket_name,id,filename,filecontent,bucket_provider);
				syncbuckets.push(diskbucket);
			} catch (err) {
				uploadable=false
				console.log(`[upload_new] Failed to push to the bucket! $ {err}`);
			}

        }

		for (var i=0; i< disklist.length; i++) {
			var diskbucket = disklist[i];
			diskbuckets.push(diskbucket);
		}


        // update the metatree only if update is successful
		console.log(`\n[upload_new] About to call filesyscontrol with arguments id ${id}, filename ${filename}, hash ${filenamehash}`);
		await filesyscontrol.create_file_entry(id, filename, filenamehash, diskbuckets, syncbuckets);	
		console.log(`[upload_new] About to call version_updater to update gc buckets...`);
		await version_updater(id, syncbuckets,filename,0);
    } else {
        console.log("[upload_new] This should not happen! Someone tampered with the environment and deleted it!");
		uploadable = false;
    }
	console.log("[upload_new] ended")
    return uploadable;
}


function shuffleArray(array) {
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
    return array;
}

async function sendTx(privKey, unsignedTx) {
	const signedTx = await web3.eth.accounts.signTransaction(
			{	
				to: contractAddr,
				gas: await unsignedTx.estimateGas({from: ownerAddr}),
				data: unsignedTx.encodeABI()
			},
			privKey
		);
	return await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
}

async function addUser(userAddr, merkleHash, hasFile, signatureObj) {
	console.log("addUser function called for web3 stuff... this should NOT be called before the authenticate function!");
	console.log(`These are the values being passed in: userAddr ${userAddr}, merkleHash ${merkleHash}, signatureObj ${JSON.stringify(signatureObj)}`);
	const pendingTx = contractAPI.methods.addUser(userAddr, merkleHash, hasFile, signatureObj);
	const resultTx = await sendTx(privKey, pendingTx);
	console.log("Inside addUSer after the addUSer BC function call",resultTx)
	return resultTx;
}

async function removeUser(userAddr, signatureObj) {
	console.log("[func] removeUser: Attempting to remove the user...");
	const pendingTx = contractAPI.methods.removeUser(userAddr, signatureObj);
	console.log("[func] removeUser: After contract remove user is called...");
	const resultTx = await sendTx(privKey, pendingTx);
	console.log(`[func] removeUser: After grabbing the result ${JSON.stringify(resultTx)}`);
	return resultTx;
}

async function getUser(UserAddr) {
	const userVal = await contractAPI.methods.files(ownerAddr).call();
	console.log(userVal['merkleHash'], userVal['hasFile'], userVal['reg']);
	return userVal;
}

// This method gets the user merkle tree root from blockchain
async function getUserRootBC(userAddr)
{
	var addrHashMap=await contractAPI.methods.files(userAddr).call()
	return addrHashMap

};

// this is just a function i created for gupdating merkle root in my local this can be replaced.
async function updateUserHash(userAddr, merkleHash,signatureObj) {
	// const userAddr = userAddr;
	// const merkleHash = merkleHash;
	const pendingTx = contractAPI.methods.updateHash(userAddr, merkleHash,signatureObj);
	console.log("Inside updateMerkleHash:",merkleHash);
	const gasCost = await web3.eth.estimateGas({
		"value": 0x0,
		"data": pendingTx.encodeABI(),
		"from": ownerAddr,
		"to": contractAddr
	});
	const resultTx = await sendTx(privKey, pendingTx);
	return resultTx;
}


async function updateHasFile(userAddr, hasFile,signatureObj) {
	// const userAddr = userAddr;
	// const merkleHash = merkleHash;
	const pendingTx = contractAPI.methods.changeHaveFileStatus(userAddr, hasFile,signatureObj);
	console.log("Inside updateMerkleHash:",merkleHash);
	const gasCost = await web3.eth.estimateGas({
		"value": 0x0,
		"data": pendingTx.encodeABI(),
		"from": ownerAddr,
		"to": contractAddr
	});
	const resultTx = await sendTx(privKey, pendingTx);
	return resultTx;
}

// function to update the version count
async function version_updater(id, buckets, filename, ver){
    // after user inserts a file (whether new or edit), we want to reflect these changes to the buckets
    // filestructure defined in providers.py,
    // datastruct = {"project", "bucket", "files []"}
    console.log(`[version_updater] Attempting to update the metadata file in each bucket`);
    for (const bucket of buckets) {
        // retrieve the file from each bucket
		console.log(`[version_updater] whats inside bucket`,bucket);
		var bucket_name=bucket['bucket']
		var bucket_key=bucket['keyfile']
		var bucket_project_id=bucket["project"]
		var bucket_provider={
			  projectId: bucket_project_id,
			  keyFilename: bucket_key
		};        
		metadatafile = await googlebucket.gc_readMetaFile(bucket_name, "__metadata-users__.json", bucket_provider)
        var bucketfilename = id+"-"+filename;
		var jsonMetadata=JSON.parse(metadatafile)
        console.log(`[version_updater] Checking for filename ${jsonMetadata} in the gc metadata file...`);

        jsonMetadata["files"][bucketfilename]= ver
        // attempt to write back to the cloud
        await googlebucket.gc_uploadMetaFile(bucket_name, "__metadata-users__.json", JSON.stringify(jsonMetadata), bucket_provider)
    }
};

async function version_deleter(id, buckets, filename){
	console.log(`[version_deleter] Attempting to remove the metadata entry from each file in buckets `, buckets);
	for (const bucket of buckets) {
		const bucketMetaFile='__metadata-users__.json'
		var bucket_name=bucket['bucket']
		    var bucket_key=bucket['keyfile']
		    var bucket_project_id=bucket["project"]
		    var bucket_provider={
  			    projectId: bucket_project_id,
  		    	keyFilename: bucket_key
		    };
		// I believe we got new syntax, so we need to update this
		var metaContent = await googlebucket.gc_readMetaFile(bucket_name, bucketMetaFile, bucket_provider);
		metaContent=JSON.parse(metaContent)
		var bucketfilename = id+"-"+filename;
		console.log(`[version_deleter] Attempting to remove it now...`)
		try {
			delete metaContent['files'][bucketfilename];
			console.log("[version_deleter], checking if file was deleted or not ",JSON.stringify(metaContent))
			await googlebucket.gc_uploadMetaFile(bucket_name, bucketMetaFile, JSON.stringify(metaContent),bucket_provider)
			await googlebucket.gc_deleteFile(bucket_name, id, filename, bucket_provider)

		} catch (err) {
			console.log(`[version_deleter] WARNING: Could not delete the entry! Reason below:\n${err}`);
		}
	}

}


// export all the functions.
module.exports = {"insert_user":insert_user,
				  "authenticate":authenticate,
				  "manage_upload":manage_upload,
				  "manageDownload":manageDownload,
				  "setUserMerkleData":setUserMerkleData,
				  "addUser": addUser,
				  "getUser": getUser,
				  "removeUser": removeUser,
				  "getUserRootBC": getUserRootBC,
				  "authenticateFileAccess":authenticateFileAccess,
				  "version_deleter":version_deleter,
				  "updateMerkleAfterDelete":updateMerkleAfterDelete
				};
