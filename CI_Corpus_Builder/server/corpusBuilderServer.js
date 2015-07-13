'use strict';

var username = '73a9b89e-4414-47a0-9cb8-0a16e7b46ce3';
var password = 'GJORLArYnWDB';
var corpus_create_URL='https://gateway.watsonplatform.net/concept-insights-beta/api/v1/corpus/'+username+'/';
var doc_create_URL	 ='https://gateway.watsonplatform.net/concept-insights-beta/api/v1/corpus/'+username+'/';
var corpus_delete_URL='https://gateway.watsonplatform.net/concept-insights-beta/api/v1/corpus/'+username+'/';
var corpusListUrl='https://gateway.watsonplatform.net/concept-insights-beta/api/v1/corpus/';
var wiki_concepts_URL="https://gateway.watsonplatform.net/concept-insights-beta/api/v1/graph/wikipedia/en-20120601?func=annotateText";
var corpus_search_URL="https://gateway.watsonplatform.net/concept-insights-beta/api/v1/searchable/"+username+"/";
var fetch_doc_URL="https://gateway.watsonplatform.net/concept-insights-beta/api/v1/corpus/"+username+"/";
var tempfile="tempfile.zip";
var labelTag="<H1>"; //UPPERCASE! Search the doc for this tag to make the label

var fs = Npm.require('fs');
var AdmZip = Npm.require('adm-zip');
var zipDocs = new Mongo.Collection(null);
var go=true; // change this flag to false to abandon processing

function doUnzip() 
	{
	go=true; //first step
	console.log("Unzipping "+tempfile);
	var zip = new AdmZip(tempfile);
	var zipEntries = zip.getEntries();
	var metafile = [];
	var count = 0;
	zipDocs.remove({});
	zipEntries.forEach(function(zipEntry) 
		{
		var entry={"filename":"","docId":"","label":"","data":""};
		var fn=zipEntry.entryName; //filename
		entry.filename=fn;
		entry.docId=fn.replace(/[%\.]/g,""); //Watson doesn't like percent signs or periods.
//		console.log(entry.docId);
		var docData=zipEntry.getData().toString();
		entry.data=docData;
		var upData=docData.toUpperCase();
		var labelStart=upData.indexOf(labelTag)+labelTag.length;
		var labelEnd=upData.indexOf("</"+labelTag.substr(1));
		entry.label=docData.substring(labelStart,labelEnd);
		metafile=metafile.concat(entry); //for returning to browser
		zipDocs.insert(entry);			// for adding to corpus later
		count++;
		});
	return metafile;
	}

function removeACorpus(name)
	{
	console.log("Deleting corpus "+name);
	try
		{
		var results=HTTP.del(corpus_delete_URL+name,
			{
			"auth": username+":"+password
	  		});
		console.log("Corpus "+name+" was deleted.");
		}
	catch(err)
		{
		console.log('Error deleting corpus '+name+":", err);
		go=false
		throw err;
		}
	}
	
function makeACorpus(name)
	{
	if (go)
		{
		console.log("Creating corpus "+name);
		try
			{
			var results=HTTP.put(corpus_create_URL+name,
				{
				"data":{"access": "private"},
				"auth": username+":"+password
		  		});
			console.log("Corpus "+name+" was created.");
			}
		catch(err)
			{
			console.log('Error creating corpus '+name+":", err);
			go=false
			throw err;
			}
		}
	}

function docExists(corpus, docId)
	{
	var exists=false;
	try
		{
		var results=HTTP.get(fetch_doc_URL+corpus+'/'+docId, 
			{
			"auth":username+":"+password
			});
		exists=true;
		}
	catch (err)
		{
		// exists var already false
		}
//	console.log("document "+docId+(exists?" exists":" does not exist")+" in corpus "+corpus);
	return exists;
	}

// load the corpus with the documents
function loadCorpus(corpusName) 
	{
	if (go)
		{
		var documents=zipDocs.find();
		documents.forEach(addDoctoCorpus,{"corpusName":corpusName});
		}
	}

/**
 * Add a document to the corpus
 * @param doc
 * @param index
 * @param array
 * @returns
 */
function addDoctoCorpus(doc, index, array) 
	{
	if (go)
		{
		if (docExists(this.corpusName,doc.docId)) //then update it
			{
			try
				{
				var results=HTTP.post(doc_create_URL+this.corpusName+'/'+doc.docId, 
						{
						"auth":username+":"+password,
						"data":{
					  		"label": doc.label,
							"parts":[{
								"name": doc.docId,
				      	   		"data": doc.data
				          		}]
							}
						});
				addedDocs.insert({"label":doc.label});
				console.log("Updated "+doc.label);
				}
			catch (err)
				{
				console.log('Error updating document '+doc.docId+' in corpus '+this.corpusName+':', err);
				go=false
				throw err;
				}
			}
		else // create it
			{
			try
				{
				var results=HTTP.put(doc_create_URL+this.corpusName+'/'+doc.docId, 
					{
					"auth":username+":"+password,
					"data":{
				  		"label": doc.label,
						"parts":[{
							"name": doc.docId,
			      	   		"data": doc.data
			          		}]
						}
					});
		//		console.log("Add doc "+doc.docId+" to corpus "+this.corpusName+" returned "+results);
				addedDocs.insert({"label":doc.label});
				console.log("Added "+doc.label);
				}
			catch(err)
				{
				console.log('Error creating document '+doc.docId+' in corpus '+this.corpusName+':', err);
				go=false
				throw err;
				}
			}
		}
	}

Meteor.methods({
	
	process_zipFile:function(zipfile)
		{
		console.log("Processing zip ");
		addedDocs.remove({}); //clear the list
		var data=EJSON.parse(zipfile);
		console.log("zipfile is type "+typeof zipfile);
		
		var status="Unzip failed: Unknown error."; //default to failure
		try
			{
			fs.writeFileSync(tempfile, data, 'binary');
			console.log("File "+tempfile+" was written.");
			status=doUnzip();
			}
		catch (err)
			{
			console.log("Error! ");
			console.log(err);
			status={"status":"error","message":err};
			throw err;
			}
		return status;
		},
		
	  // delete a corpus
	removeCorpus:function(corpusName)
		{
		removeACorpus(corpusName); //throws exception to callback if error
		return true;
		},

	  // create the corpus
	createCorpus:function(corpusName)
		{
		makeACorpus(corpusName); //throws exception to callback if error
		return true;
		},
		
	  // load the corpus with documents
	fillCorpus:function(corpusName)
		{
		console.log("Loading documents into corpus "+corpusName);
		loadCorpus(corpusName);	 //throws exception to callback if error
		return true;
		},

	// Get a list of corpora
	listCorpora:function() 
		{
		console.log("Getting corpus list...");
		var corps=null;
		var corps=HTTP.get(corpusListUrl, 
			{
			"access": "public",
			"id": username,
			"auth":username+":"+password
			});

		console.log("Retrieved corpora");
		var ourCorpora=[];
		for (var seq in corps.data) 
			{
			var corpname=corps.data[seq].id;
			var parts=corpname.split('/');
			if (username==parts[1])
				{
				ourCorpora=ourCorpora.concat({"name":parts[2]});
				}
			}
		
		return ourCorpora;	
		}
		

}); //meteor.methods


