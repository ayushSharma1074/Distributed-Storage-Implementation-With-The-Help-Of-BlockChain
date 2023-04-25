const filesyscontrol = require("./filesyscontrol");
const googlebucket = require("./googlebucket")

async function synchronize()
{

console.log("[Synchronize] started")    
var metadata=await filesyscontrol.load_tree()
for (const user of  metadata)
{
    var id=user['id']
    console.log("[Synchronize] started, Currently checking for user with id ",id)    
    for (const file of user['files'])
    {
        var filename=file['filename']
        var latest_version=file['version']
        var sync_bucket=file['syncbuckets'][0]
        console.log("[Synchronize] started, Currently checking for file with filename, version and sync buckets ",filename, latest_version, sync_bucket)    
        for(const bucket of file['diskbucket'])
        {
            console.log("[Synchronize] started, Currently checking if the bucket ",bucket," is sync or not")       
            var bucket_name=bucket['bucket']
		    var bucket_key=bucket['keyfile']
		    var bucket_project_id=bucket["project"]
		    var bucket_provider={
  			    projectId: bucket_project_id,
  		    	keyFilename: bucket_key
		    };
            if(await googlebucket.gc_checkBucketStatus(bucket_name,bucket_provider))
		    {
                var bucket_filename=id+"-"+filename
                var bucket_metaData="__metadata-users__.json"
			    var data=await googlebucket.gc_readMetaFile(bucket_name,bucket_metaData,bucket_provider)
                var json_data=JSON.parse(data)
                if (json_data["files"][bucket_filename] === null || typeof json_data["files"][bucket_filename] === "undefined" || json_data["files"][bucket_filename]!==latest_version)
                {
                    var sync_bucket_name=sync_bucket['bucket']
                    var sync_bucket_key=sync_bucket['keyfile']
                    var sync_bucket_project_id=sync_bucket["project"]
                    var sync_bucket_provider={
                          projectId: sync_bucket_project_id,
                          keyFilename: sync_bucket_key
                    };
                    var syncData=await googlebucket.gc_readFile(sync_bucket_name,id, filename,sync_bucket_provider)
                    try{
                    await googlebucket.gc_uploadFile(bucket_name, id, filename, syncData, bucket_provider)
                    json_data["files"][bucket_filename]=latest_version
                    console.log("[synchronize] where  is the metadata",JSON.stringify(json_data))
                    await googlebucket.gc_uploadMetaFile(bucket_name,bucket_metaData,JSON.stringify(json_data),bucket_provider)
                    }
                    catch(err)
                    {
                        console.log("Error in synchronize function",err.stack)
                    }
                }
		    }
	    	else
	    	{
		    	continue;
		    }
        }
    }
} 
}

module.exports = {"synchronize":synchronize}
