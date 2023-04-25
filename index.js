//index.js
/*
	This javascript file is meant to be run with node.js.
	The file consists of a server acting as an API. The API will provide interfaces 
	to interact with users for managing files. Users will be able to send and retrieve
	files from the server while providing authentication for access.
*/

const express = require("express")
const body_parser = require('body-parser');

const process = require("./process") 
const syncService=require("./synchronize")
const filesyscontrol=require("./filesyscontrol")
// The app variable will be responsible for all API-related calls.
const app = express();
app.use(body_parser.json());

const server_port = 3125;

// Define API functions
setInterval(syncService.synchronize,60000)
function server_start(){
	console.log(`The server is starting at port ${server_port}`);
}


async function add_user(req, res){
	// we will expect the following keys:
	// id: a signed hash of the ethereum address
	// v, r, s: public key
	console.log("Testing add_user function API call");
	var id = req.body["metadata"]["id"];
	var id_hash = req.body["metadata"]["id_hash"];
	var sign_v = req.body["metadata"]["sign_v"];
	var sign_r = req.body["metadata"]["sign_r"];
	var sign_s = req.body["metadata"]["sign_s"];

	// create the new user account extracted from the request
	var identifier = {"hashedMessage":id_hash, "v":sign_v, "r":sign_r, "s":sign_s };
	console.log(`add_user function called. looking at values from the request:`);
	console.log(`The values from request: ${id} ${id_hash} and ${sign_v}, ${sign_r}, ${sign_s}`);

	var authenticate_valid = await process.authenticate(id, identifier);
	var successful_insert = false;
	if(authenticate_valid){
		successful_insert = await process.insert_user(id);
		if(successful_insert) {
			// When we add the user he wont have any file on the storage so we need to set his merkle root as empty.
			try {
				// please remove the below 2 lines when not in test mode
				const TEST_MODE = false;
				if(TEST_MODE){ await process.removeUser(id, identifier)};
				console.log("Adding user now...");
				await process.addUser(id, 0x0, false, identifier)
			} catch (err) {
				console.log("WARNING: Attempting to add a user that already exists to the blockchain!",err.stack);
				try {
					var user_info = await process.getUser(id);
					console.log(`More information: ${JSON.stringify(user_info)}`);
				} catch (err2) {
					console.log(`This is not supposed to happen! (This is just how life works) ${err2}`);
				}
			}
		} else {
			console.log("The user already exists in the metatree system, insertion fail!");
		}

	}
	res.send(successful_insert);
};

async function upload_file(req, res, next){
	console.log(`\nUpload file API is called.\n`);

	var id = req.body["metadata"]["id"];
	var filename = req.body["metadata"]["filename"];
	var filehash = req.body["metadata"]["filehash"];
	var sign_v = req.body["metadata"]["sign_v"];
	var sign_r = req.body["metadata"]["sign_r"];
	var sign_s = req.body["metadata"]["sign_s"];

	var filecontent = req.body["filecontent"];

	console.log(`\nid, filename, filehash, v, r, s = ${id}, ${filename}, ${filehash}, ${sign_v}, ${sign_r}, ${sign_s}`);
	console.log(`The file contents = ${filecontent}`);

	// the user signs the file, and so we check that the user actually owns the file
	var identifier = {"hashedMessage":filehash, "v":sign_v, "r":sign_r, "s":sign_s };
	var uploadable = false;
	//var contents = req.file.buffer;
	console.log(`filename ${filename}, filehash ${filehash}, v ${sign_v}, r ${sign_r}, s ${sign_s}`);
	var authenticate_valid = await process.authenticate(id, identifier);
	if(authenticate_valid){
		console.log(`The authentication is valid, we can now store the contents: ${filecontent}`);
		try {
			console.log(`This is a test to save a file... replace this with more complex code!`);
			await process.setUserMerkleData(id,filename,identifier);
			uploadable = await process.manage_upload(id, filename, filehash, filecontent);	
		} catch (err) {
			console.log(`This is just a test to save the file! Why did it fail!? ${err.stack}`);
		}
	} 

	res.send(uploadable);

}



//Logic to handle deleting a file
async function delete_file(req, res, next) {
	console.log(`\Delete file API is called.\n`);
	var id = req.body["metadata"]["id"];
	var filename = req.body["metadata"]["filename"];
	var filehash = req.body["metadata"]["filehash"];
	var sign_v = req.body["metadata"]["sign_v"];
	var sign_r = req.body["metadata"]["sign_r"];
	var sign_s = req.body["metadata"]["sign_s"];

	// the user signs the file, and so we check that the user actually owns the file
	var identifier = {"hashedMessage":filehash, "v":sign_v, "r":sign_r, "s":sign_s };
	//var contents = req.file.buffer;
	console.log(`[delete_file] filename ${filename}, filehash ${filehash}, v ${sign_v}, r ${sign_r}, s ${sign_s}`);
	var authenticate_valid = await process.authenticate(id, identifier);
	if(authenticate_valid){
		console.log(`[delete_file] The authentication is valid, we can now delete the file: ${filename}`);
		// do we need some blockchain code here?

		// delete the metadata from the central system
		var diskbuckets = await filesyscontrol.delete_file_entry(id, filename);
		// please double check the logic, it may only be partially correct currently (orphaned buckets)
		console.log(`[delete_file] Returned from delete_file_entry, received ${JSON.stringify(diskbuckets)}`);
		await process.version_deleter(id, diskbuckets,filename);
		await process.updateMerkleAfterDelete(id,identifier,filename)
		// remove them from s remote drives
		console.log(`[delete_file] Attempting to extract attributes from guessing, this may cause a crash!`);
		console.log(`[delete_file] Deletion of ${filename} completed after authenticated ${authenticate_valid}.`);

	}
	res.send();

}

// Logic to handke the download of the file.
async function download_file(req, res, next)
{
	console.log(`\Download file API is called.\n`);
	var id = req.body["metadata"]["id"];
	var filename = req.body["metadata"]["filename"];
	var filehash = req.body["metadata"]["filehash"];
	var sign_v = req.body["metadata"]["sign_v"];
	var sign_r = req.body["metadata"]["sign_r"];
	var sign_s = req.body["metadata"]["sign_s"];


	// the user signs the file, and so we check that the user actually owns the file
	var identifier = {"hashedMessage":filehash, "v":sign_v, "r":sign_r, "s":sign_s };
	//var contents = req.file.buffer;
	console.log(`filename ${filename}, filehash ${filehash}, v ${sign_v}, r ${sign_r}, s ${sign_s}`);
	var authenticate_valid = await process.authenticate(id, identifier);
	if(authenticate_valid){
		console.log(`The authentication is valid, we can now download the file: ${filename}`);
		await process.authenticateFileAccess(id,filename).then(async function(root){console.log(root)
		if(root)
		{
			process.manageDownload(id,filename,identifier).then(function(content){
				console.log("printing content:",content)
				res.send(content)
			})
			
		}
		else
		{
			console.log("User does not have access")	
		} })
		

			
	} else {
		res.send(authenticate_valid);
	}

};


// //Logic to handle deleting a file
// async function delete_file(req, res, next) {
// 	console.log(`\Delete file API is called.\n`);
// 	var id = req.body["metadata"]["id"];
// 	var filename = req.body["metadata"]["filename"];
// 	var filehash = req.body["metadata"]["filehash"];
// 	var sign_v = req.body["metadata"]["sign_v"];
// 	var sign_r = req.body["metadata"]["sign_r"];
// 	var sign_s = req.body["metadata"]["sign_s"];

// 	// the user signs the file, and so we check that the user actually owns the file
// 	var identifier = {"hashedMessage":filehash, "v":sign_v, "r":sign_r, "s":sign_s };
// 	//var contents = req.file.buffer;
// 	console.log(`[delete_file] filename ${filename}, filehash ${filehash}, v ${sign_v}, r ${sign_r}, s ${sign_s}`);
// 	var authenticate_valid = await process.authenticate(id, identifier);
// 	if(authenticate_valid){
// 		console.log(`[delete_file] The authentication is valid, we can now delete the file: ${filename}`);
// 		// do we need some blockchain code here?

// 		// delete the metadata from the central system
// 		var diskbuckets = await delete_file_entry(id, filename);
// 		// remove them from the remote drives
// 		console.log(`[delete_file] Returned from delete_file_entry, received ${JSON.stringify(diskbuckets)}`);
// 		console.log(`[delete_file] Attempting to extract attributes from guessing, this may cause a crash!`);
// 		for(const diskbucket in diskbuckets){
// 			try {
// 				// referenced from process.js [upload_new] line 220
// 				var bucket_name = diskbucket["bucket"];
// 				var bucket_provider = diskbucket["project"];
// 				await gc_deleteFile(bucket_name, id, filename, bucket_provider)
// 			} catch (err) {
// 				console.log(`[delete_file] Failed to delete file! ${err}`);
// 			}
// 		}
// 		console.log(`[delete_file] Deletion of ${filename} completed after authenticated ${authenticate_valid}.`);

// 	}
// 	res.send();

// }

// Code to get the server running
app.post("/add_user", add_user);
app.post("/upload_file", upload_file);
app.post("/download_file", download_file);
app.post("/delete_file", delete_file);
app.listen(server_port, server_start);
