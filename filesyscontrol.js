//filesyscontrol.js
/*
	This javascript file is used to abstract the metadata management away from
	the main processing code.
*/

const fs = require('fs');

const filename_metatree = "metatree.json";

// function to load the metadata file keeping track of the filesystem
async function load_tree(){
	var metatreejson = fs.readFileSync(filename_metatree)
	var metatree = JSON.parse(metatreejson);
	return metatree;
}

// This function will return all the disks on which the file is stored.
async function getFileBuckets(userAddr,fileName)
{
	var metatree = await load_tree();
	var userIndex = await get_user_by_id(userAddr,metatree);
	console.log("[getFileBuckets] User index",userIndex)
	if(userIndex!=null && userIndex!=-1)
	{
		var fileIndex = await get_file_index(metatree[userIndex],fileName);
		console.log("[getFileBuckets] file index",fileIndex)
		var fileBuckets=metatree[userIndex]['files'][fileIndex]['diskbucket'];
		console.log("[getFileBuckets] file bucket",fileBuckets)
		return fileBuckets

	}

};


// Will return the merkle tree realted to a user
async function getMerkleTree(userAddr)
{

	console.log("[getMerkleTree] called")
	var metadata= await load_tree()
	var userIndex= await get_user_by_id(userAddr,metadata)
	console.log("[getMerkleTree] ended")
	return metadata[userIndex]['merkle']
};

// Will update the merkle tree in the metadataa file.
async function setMerkleTree(userAddr,merkleTree)
{
	console.log("[setMerkleTree] called")
	var metadata= await load_tree()
	var userIndex= await get_user_by_id(userAddr,metadata)
	if(merkleTree=='')
	{
		metadata[userIndex]['merkle']=''
	}
	else
	{
		metadata[userIndex]['merkle']=JSON.stringify(merkleTree.dump())
	}
	fs.writeFileSync(filename_metatree, JSON.stringify(metadata));	
	console.log("[setMerkleTree] ended")
}




// function to add an entry into the metatree when a new file is being inserted
async function create_file_entry(id, filename, filenamehash, diskbuckets, syncbuckets){
	// we may wish to create more args after discussion...
	console.log(`[create_file_entry] Inside filesyscontrol, creating file entry using id ${id}, filename ${filename}`);
	var metatree = await load_tree();
	var users_total = metatree.length;
	var file_obj = {"filename": filename,				// string
					"version": 0,
					"filenamehash": filenamehash,		// hash					
					"diskbucket": diskbuckets,
					"syncbuckets": syncbuckets};			// array
	var user_index = await get_user_by_id(id, metatree);
	console.log(`[create_file_entry] The user index is ${user_index}`);
	if(user_index!==-1){
		console.log(`[create_file_entry] Found the user ${id}, attempting to update metatree...`);
		metatree[user_index]["files"].push(file_obj);
		fs.writeFileSync(filename_metatree, JSON.stringify(metatree));
	}

}

// function to remove an entry from the metatree when a file is being deleted
async function delete_file_entry(id, filename){
	var metatree = await load_tree();
	var diskbuckets = [];
	try {
		var user_id = await get_user_by_id(id, metatree)
		var targ_file_index = await get_file_index(metatree[user_id], filename);
		console.log(`[delete_file_entry] the target file index is ${targ_file_index} for ${filename}`);
		diskbuckets = metatree[user_id]["files"][targ_file_index]['diskbucket'];
		console.log(`[delete_file_entry] before the remove: ${JSON.stringify(metatree[user_id]["files"])}`);
		metatree[user_id]["files"].splice(targ_file_index,1);
		console.log(`[delete_file_entry] the file has been removed: ${JSON.stringify(metatree[user_id]["files"])}`);
		console.log("[delete_file_entry] writing the changes to file");
		fs.writeFileSync(filename_metatree, JSON.stringify(metatree));
	} catch (err) {
		console.log(`[delete_file_entry] could not delete the file for some reason!\n${err}`);
	}
	// we want to return the diskbuckets because we want to remove all the files from them physically
	return diskbuckets;
}

// function to check if a file already exists in the system
async function check_file_existence(id, filename){
	console.log(`Inside [check_file_existence] to see if a filename already exists with a user ->${filename}`);
	var metatree = await load_tree();
	var user_index = await get_user_by_id(id, metatree);
	console.log(`[check_file_existence] The user index is ${user_index}`);
	var user = metatree[user_index];
	var user_files = user["files"];
	var file_count = user_files.length;
	var target_file = null;
	console.log(`[check_file_existence] The filecount is ${file_count}`);
	for(let i=0; i<file_count; i++){
		console.log(`[check_file_existence] looking at file at ${i}  ${user_files[i]["filename"]} ${user_files[i]["filename"]===filename}`);
		if(filename===user_files[i]["filename"]){
			console.log(`[check_file_existence] Found the file! The filename is ${filename}`);
			target_file = user_files[i];
			break
		}
	}
	return target_file;
}

// reinsert a file into the user
async function update_file_metadata(id, filemetadata){
	var success = true;
	var metatree = await load_tree();
	var user_id = await get_user_by_id(id, metatree);
	if(user_id!==-1){
		var user = metatree[user_id];
		var filename = filemetadata["filename"];
		// update the file metadata
		var file_index = await get_file_index(user, filename);
		if(file_index!==-1){
			console.log("[update_file_metadata] Attempting to write the new file metadata into the metatree!");
			metatree[user_id]["files"][file_index] = filemetadata;
			console.log(`[update_file_metadata] The new array in the metatree is ${JSON.stringify(metatree[user_id]["files"][file_index])}`);
			console.log("[update_file_metadata] Attempting to write to the metatree file now...");
			fs.writeFileSync(filename_metatree, JSON.stringify(metatree));
			console.log("[update_file_metadata] Done writing to the metatree");
		}

	} else {
		console.log("[update_file_metadata] This case should be impossible, did someone delete the user?");
		throw "[update_file_metadata] User not found in the metatree error!";
	}
	return success;
}

// function to check if a user exists, returns the index of the user in the metatree if found
async function get_user_by_id(id, metatree){
	console.log("[get_user_by_id] called, printing id and metatree length", id, metatree.length)
	var user = -1;
	var users_total = metatree.length;
	for(let i=0; i<users_total; i++){
	console.log("[get_user_by_id] get user by id",id,metatree[i]['id'])

		if(metatree[i]["id"]==id){

			user = i;
			break;
		}
	}

	return user;
}

// function to retrieve the user record from the metatree
async function retrieve_user_record(id){
	var metatree = await load_tree();
	var user_metadata = null;
	var user_id = await get_user_by_id(id);
	console.log(`[retrieve_user_record] The user_id retrieved is ${user_id}, id input is ${id}`);
	if(user_id!==-1){
		user_metadata = metatree[user_id];
	}
	return user_metadata
}

// given a list of files owned by a user, get a list of all unique buckets used by that user.
async function get_bucket_union(filelist){
	var filecount = filelist.length;
	var bucket_union = [];
	console.log(`[get_bucket_union] Processing filelist with a length of ${filecount}`);
	for(let i=0; i<filecount; i++){
		var filebuckets = filelist[i]["diskbucket"];
		var fbcount = filebuckets.length;
		for(let j=0; j<fbcount; j++){
			if(!bucket_union.includes(filebuckets[j])){
				console.log(`[get_bucket_union] Discovered ${JSON.stringify(filebuckets[j])} not in the list, adding...`);
				bucket_union.push();
			}
		}
		
	}
	console.log(`[get_bucket_union] Returning control to caller with list--> ${bucket_union}...`);
	return bucket_union;

}

// function to return the position of the current file index in the array
async function get_file_index(user, filename){
	console.log("[get_file_index], printing filename ",filename)
	var user_files = user["files"];
	var file_count = user_files.length;
	var file_index = -1;
	for(let i=0; i<file_count; i++){
		if(user_files[i]['filename']===filename){
			file_index = i;
			break;
		}
	}

	return file_index;
}

// check if a user exists in the metadata file
async function check_user_exists(id, metatree){
	var targ_user = await get_user_by_id(id, metatree);
	var user_exists = true;
	if(targ_user===-1){
		user_exists = false;
	}
	return user_exists;
}

// function to create a brand new user in the system
async function create_user_entry(user_id){
	var metatree = await load_tree();

	// check that the user exists in the system
	var existing = await check_user_exists(user_id, metatree);
	console.log(`[create_user_entry] Attempting to create a new user, does the user ${user_id} exist? ${existing}`);
	var created = false;
	if(!existing){
		// add a new user if it does not already exist
		try {
			console.log(`[create_user_entry] Attempting to add a new user and pushing into the metatree...`);
			var user_new = {"id":user_id,
							"merkle":null,
							"files": []};
			metatree.push(user_new);
			fs.writeFileSync(filename_metatree, JSON.stringify(metatree));
			created = true;
		} catch (err) {
			// insertion failed, so treat it as failed
			console.log(`[create_user_entry] Failed to write to ${filename_metatree}. Error: ${err}`);

		}
	}

	return created;

}

// export all the necessary functions.
module.exports = {"create_user_entry":create_user_entry,
				  "create_file_entry":create_file_entry,
				  "check_file_existence":check_file_existence,
				  "getMerkleTree":getMerkleTree,
				  "setMerkleTree":setMerkleTree,
				  "getFileBuckets":getFileBuckets,
				  "retrieve_user_record":retrieve_user_record,
				  "get_bucket_union":get_bucket_union,
				"update_file_metadata":update_file_metadata,
				"load_tree":load_tree,
			"delete_file_entry":delete_file_entry};
