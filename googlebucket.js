// Import the Google Cloud client library
const {Storage} = require('@google-cloud/storage');


// Uploads a file to a bucket
async function gc_uploadFile(bucketName, id, fileName, fileData, bucket_provider) {
	var success = true;
	var storage = new Storage(bucket_provider);
	console.log("[gc_uploadFile] the bucket provider is:\n",bucket_provider);
	const bucket = storage.bucket(bucketName);
	const file = bucket.file(`${id}-${fileName}`);

	try {
		const stream = file.createWriteStream({
		resumable: false,
		contentType: 'application/octet-stream',
		});

		// Pass the file data to the stream
		stream.write(fileData);

		stream.on('error', (err) => {
			success=false
			console.error(err);
		});

		stream.on('finish', () => {
			console.log(`File ${fileName} uploaded to ${bucketName}.`);
		});

		// Close the stream to ensure that all data is flushed to the file
		stream.end();

		storage = null;
	} catch (err) {
		success=false
		console.log(`CRITICAL: Failed to upload the file ${fileName} due to error:\n ${err.stack}`);
		throw "[gc_uploadFIle] File upload error";
	}
return success
};

async function gc_uploadMetaFile(bucketName, fileName, fileData, bucket_provider) {

	var storage = new Storage(bucket_provider);
	console.log("ayush_log:",bucket_provider);
	console.log("[gc_uploadMetaFile] yeah!! where is the meta data ???? ",fileData)
	const bucket = storage.bucket(bucketName);
	const file = bucket.file(`${fileName}`);

	try {
		const stream = file.createWriteStream({
		resumable: false,
		contentType: 'application/octet-stream',
		});

		// Pass the file data to the stream
		stream.write(fileData);

		stream.on('error', (err) => {
			console.error(err);
		});

		stream.on('finish', () => {
			console.log(`File ${fileName} uploaded to ${bucketName}.`);
		});

		// Close the stream to ensure that all data is flushed to the file
		stream.end();

		storage = null;
	} catch (err) {
		console.log(`CRITICAL: Failed to upload the file ${fileName} due to error:\n${err}`);
	}
}


// Read the file from a bucket
async function gc_readFile(bucketName, id, fileName, bucket_provider) {
	var storage = new Storage(bucket_provider);
	console.log("Inside gc_readfile, checking bucket provider",bucket_provider)
	var dataFile = null;
	try {
		const file = storage.bucket(bucketName).file(`${id}-${fileName}`);
		
		const [contents] = await file.download();
		dataFile = contents.toString();
		console.log('File contents:', contents.toString());

	} catch (err) {
		console.log(`CRITICAL: Failed to read the file ${fileName} due to error:\n${err}`);
	}

	storage = null;
	return dataFile;
}

async function gc_readMetaFile(bucketName, fileName, bucket_provider) {
	var storage = new Storage(bucket_provider);
	console.log("Inside gc_readfile, checking bucket provider",bucket_provider)
	var dataFile = null;
	try {
		const file = storage.bucket(bucketName).file(`${fileName}`);
		
		const [contents] = await file.download();
		dataFile = contents.toString();
		console.log('File contents:', contents.toString());

	} catch (err) {
		console.log(`CRITICAL: Failed to read the file ${fileName} due to error:\n${err}`);
	}

	storage = null;
	return dataFile;
}


//Delete a file from a bucket
async function gc_deleteFile(bucketName, id, fileName, bucket_provider) {
	console.log(`[gc_deleteFile] Taking in args ${bucketName}, ${id}, ${fileName}, ${bucket_provider}`);
	var storage = new Storage(bucket_provider);
	try {
		await storage.bucket(bucketName).file(`${id}-${fileName}`).delete();
		console.log(`${fileName} deleted from ${bucketName}.`);
		storage = null;
	} catch (err) {
		console.log(`ALERT: Failed to delete the file ${fileName} due to error:\n${err}`);
	}
	
}

// Check if a bucket exists or not
async function gc_checkBucketStatus(bucketName, bucket_provider) {
	var storage = new Storage(bucket_provider);

	const bucket = storage.bucket(bucketName);
	var result;

	try {
		result = await bucket.getMetadata();
		console.log(`Bucket ${bucketName} exists and is accessible.`);
	} catch (err) {
		console.log(`Bucket ${bucketName} does not exist or is not accessible:`);
		result = null;
	}

	storage = null;
	return result;
}

// export all the necessary functions.
module.exports = {"gc_uploadFile":gc_uploadFile,
				  "gc_readFile":gc_readFile,
				  "gc_deleteFile":gc_deleteFile,
				  "gc_checkBucketStatus":gc_checkBucketStatus,
				  "gc_readMetaFile":gc_readMetaFile,
				  "gc_uploadMetaFile":gc_uploadMetaFile};
