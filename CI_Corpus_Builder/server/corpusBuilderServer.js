'use strict';

var service_url="https://gateway.watsonplatform.net/concept-insights/api";
var username = 'f7f5fa94-8a06-4376-a082-c83d69b9d344';
var password = 'rEigWBfxVzyu';
var baseURL="https://gateway.watsonplatform.net/concept-insights/api/v2";
var corpus_create_URL=baseURL+'/corpora/{account_id}/{corpus}';
var doc_create_URL	 =baseURL+'/corpora/{account_id}/{corpus}/documents/{document}';
var corpus_delete_URL=baseURL+'/corpora/{account_id}/{corpus}';
var corpusListUrl=baseURL+'/corpora/{account_id}';
var wiki_concepts_URL=baseURL+'/corpora/{account_id}/{corpus}/related_concepts';
var corpus_search_URL=baseURL+'/corpora/{account_id}/{corpus}/conceptual_search';
var fetch_doc_URL=baseURL+'/corpora/{account_id}/{corpus}/documents/{document}';
var account_URL=baseURL+'/accounts';

var tempfile="tempfile.zip";
var labelTag="<H1>"; //UPPERCASE! Search the doc for this tag to make the label

var fs = Npm.require('fs');
var AdmZip = Meteor.npmRequire('adm-zip');
var zipDocs = new Mongo.Collection(null);
var go=true; // change this flag to false to abandon processing

/* Substitute some variables in a string
 * subObj is name:value pairs, where name
 * is in curly brackets in the original.
 */
function fixup(original,subObj)
	{
	console.log("Incoming:",original);
	for (var old in subObj)
		{
		original=original.replace("{"+old+"}",subObj[old]);
		}
	console.log("Outgoing:",original);
	return original;
	}

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
		var entry={"filename":"","docId":"","label":"","url":"","data":""};
		var fn=zipEntry.entryName; //filename
		entry.filename=fn;
		var temp=decodeURIComponent(fn);
		entry.url=temp.substring(0,temp.indexOf(".html")); //URL to original document does not end in .html
		entry.docId=fn.replace(/[%\.]/g,""); //Watson doesn't like percent signs or periods.
		console.log(entry.url);
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
		var subs={'account_id':accountID,'corpus':name};
		var results=HTTP.del(fixup(corpus_delete_URL,subs),
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
			var subs={'account_id':accountID,'corpus':name};
			var results=HTTP.put(fixup(corpus_create_URL,subs),
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
		var subs={'account_id':accountID,'corpus':corpus,'document':docId};
		var results=HTTP.get(fixup(fetch_doc_URL,subs), 
			{
			"auth":username+":"+password
			});
		exists=true;
		}
	catch (err)
		{
		// exists var already false
		}
	console.log("document "+docId+(exists?" exists":" does not exist")+" in corpus "+corpus);
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
		var specs={"auth":username+":"+password,
					"data":{
						"label": doc.label,
						"parts":[
						    {
							"name": doc.docId,
		      	   			"data": doc.data
		          			},
		          			{
						    "name": "url",
						    "data": doc.url
						    }]
						}
					};
		var subs={'account_id':accountID,'corpus':this.corpusName,'document':doc.docId};
		
		if (docExists(this.corpusName,doc.docId)) //then update it
			{
			try
				{
				var results=HTTP.post(fixup(doc_create_URL,subs), specs);
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
				var results=HTTP.put(fixup(doc_create_URL,subs), specs);
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
		var corps=HTTP.get(fixup(corpusListUrl,{"account_id":accountID}), 
			{
			"auth":username+":"+password
			});

		console.log("Retrieved corpora",corps);
		corps=JSON.parse(corps.content);
		
//		console.log(corps);

		var ourCorpora=[];
		for (var seq in corps.corpora) 
			{
			var corpname=corps.corpora[seq].id;
			console.log(corpname);
			var parts=corpname.split('/');
			if (accountID==parts[2])
				{
				ourCorpora=ourCorpora.concat({"name":parts[3]});
				}
			}
		
		return ourCorpora;	
		}
		

}); //meteor.methods

function fetchAccountID()
	{
	console.log("Getting account ID...");
	var accountID=null;
	var accts=HTTP.get(account_URL, 
		{
		"auth":username+":"+password
		});

	if (accts)
		{
		accountID=JSON.parse(accts.content).accounts[0].account_id;
		}
	console.log("Account ID is",accountID);
	
	return accountID;
	}

//first thing, go get our account id
var accountID=fetchAccountID();

