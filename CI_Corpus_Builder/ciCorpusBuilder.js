'use strict';

function sendZip(zipfile) 
	{
	Session.set('status','processing');
	Session.set('statusReason','Working...');
	Session.set('state','uploading');
	console.log("Processing zip file");
	Meteor.call("process_zipFile", zipfile, function(err, response) 
		{
		var success=true;
		if (err)
			{
			console.log("err: ");
			console.log(err);					
	    	Session.set('status','error');
	    	Session.set('statusReason',err);
	    	success=false;
			}
		else if (response)
			{
			if ("error"==response.status)
				{
				console.log("error: ");
				console.log(response.message);					
		    	Session.set('status','error');
		    	Session.set('statusReason',response.message);
				Session.set('zipResults',[{"filename":"Error!","docId":response.message,"label":"","data":""}]);
				success=false;
				}
			else
				{
				Session.set('zipResults',response);
				document.getElementById("zipButton").childNodes[0].nodeValue="Update Corpus";
				Session.set('buttonAction','create');
				Session.set('status','ok');
				Session.set('statusReason','OK');
				}
			}
		else
			{
			Session.set('zipResults',null);
			success=false;
	    	Session.set('state','displaying');
			}
		console.log("Success is "+success);
		return success;
		});
	}

function getCorpusList()
	{
	console.log("getting corpus list");
	Session.set('status','processing');
	Session.set('statusReason','Working...');
	Meteor.call("listCorpora", function(err, response) 
		{
		if (err)
			{
			Session.set('status','error');
			Session.set('statusReason',err);
			console.log("listCorpus err: ");
			console.log(err);					
			}
		else if (response)
			{
			console.log("listCorpus response is ");
			console.log(response);
			Session.set('corpora',response);
			Session.set('status','ok');
			Session.set('statusReason','OK');
			}
		else
			{
			console.log("listCorpus response is "+response);
			Session.set('corpora',[{"name":"corpus one"},{"name":"corpus two"},{"name":"corpus three"},{"name":"corpus four"}]);
			}
		});
	}

/* Returns true if the corpus is in the corpus list on the browser */
function corpusExists(corpname)
	{
	var corps=Session.get("corpora");
	var existing=false; //assume that corpus name is new
	for (var corp in corps)
		{
		if (corpname==corps[corp].name)
			existing=true;
		}
	return existing;
	}

function removeCorpus(corpusName)
	{
	console.log("Removing corpus "+corpusName);
	Session.set('status','processing');
	Session.set('statusReason','Working...');
	
	//We have to call the delete synchronously, since we need to 
	//wait until it is deleted before we re-create it.  Unfortunately,
	//without a callback function we can't be sure it was deleted.
	//In this case the create function will fail. There is still a
	//problem with delay on the Watson side.
	Meteor.call("removeCorpus", corpusName);
	}

function makeCorpus(corpusName)
	{
	console.log("Creating corpus "+corpusName);
	Session.set('status','processing');
	Session.set('statusReason','Working...');
	Session.set('state','creating');
	Meteor.call("createCorpus", corpusName, function(err, response) 
		{
		if (err)
			{
			console.log("makeCorpus err: ");
			console.log(err);
			Session.set('status','error');
			Session.set('statusReason',"Failed. See logs."); //"err" shows as "[object Object]"
			}
		else if (response)
			{
			console.log("makeCorpus response is ");
			console.log(response);
			}
		else
			{
			console.log("makeCorpus response is "+response);
			Session.set('status','borked');
			Session.set('statusReason','Unexpected error. See logs.');
			}
    	Session.set('state','completed');
		});
	}

function loadCorpus(corpusName)
{
console.log("Loading corpus "+corpusName);
Session.set('status','processing');
Session.set('statusReason','Working...');
Session.set('state','loading');
Meteor.call("fillCorpus", corpusName, function(err, response) 
	{
	if (err)
		{
		console.log("loadCorpus err: ");
		console.log(err);
		Session.set('status','error');
		Session.set('statusReason',"Failed. See logs."); //"err" shows as "[object Object]"
		}
	else if (response)
		{
		console.log("loadCorpus response is ");
		console.log(response);
		Session.set('status','ok');
		Session.set('statusReason','OK');
		}
	else
		{
		console.log("loadCorpus response is "+response);
		Session.set('status','borked');
		Session.set('statusReason','Unexpected error. See logs.');
		}
	});
}


if (Meteor.isClient) {
	Session.setDefault('buttonAction','upload');
	Session.setDefault('status','ok');
	Session.setDefault('statusReason','OK');
	Session.setDefault('state','initial');

Meteor.methods({ //stubs
	});
	
Template.results.helpers({
	"result":function()
		{
		return addedDocs.find();
		},
	
	"count":function()
		{
		return addedDocs.find().count();
		},
		
	"showresults": function()
		{
		var state=Session.get('state');
		return state=='creating'|| state=='completed';
		},
		
	"corpusName":function()
		{
		return Session.get('corpusName');
		}
	})

Template.hello.helpers({
	creating: function()
		{
		return Session.get("buttonAction")=="create";
		},
		
	corpusNames: function()
		{
		return Session.get("corpora");
		},
		
	firstCorpus: function()
		{
		var first=Session.get("corpora");
		if (first)
			first=first[0];
		else first='{"name":"blech"}';
		return first;
		},
		
	"state": function()
		{
		return Session.get('state');
		}
		
  });

  Template.zips.helpers({
	corpdocs: function () 
		{
		return Session.get('zipResults');
		},
		
	zipcount: function () 
		{
		var ct=Session.get('zipResults');
		if (ct)
			ct=ct.length;
		else
			ct=0
		return ct;
		},
		
	"state": function()
		{
		return Session.get('state');
		}
	  });

  Template.status.helpers({
		stat: function () 
			{
			return Session.get('statusReason');
			},
			
		statusColor: function () 
			{
			var s=Session.get('status');
			return 'error'==s?'red':'ok'==s?'green':'orange';
			},
			
		"state": function()
			{
			return Session.get('state');
			}
		  });

  Template.hello.events({
    'click button': function (e,template) {
    	Session.set('status','processing');
    	Session.set('statusReason','Working...');
    	Session.set('state','uploading');
	    e.preventDefault();
	    e.stopPropagation();
	    if (Session.get('buttonAction')=='upload')
	    	{
		    var file = template.find('.half-width-input').files[0];
		    var reader = new FileReader();
		    reader.onload=function(event)
		    	{
		    	var data=event.target.result;
		    	var sfFile=EJSON.stringify(data);
		    	var sent=sendZip(sfFile);
		    	getCorpusList(); //populate the listbox of corpora
		    	}
		    reader.onerror=function(event)
		    	{
		    	var err=event.target.error;
		    	Session.set('status','error');
		    	Session.set('statusReason',err);
		    	console.log(err);
		    	alert("Error!\n"+err.name);
		    	document.uploadForm.uploadButton.disabled=true;
		    	}
		    reader.readAsBinaryString(file);
		    }
	    else //create the corpus
	    	{
	    	Session.set('state','creating');
			Session.set('zipResults',''); //clear the zips section
			Session.set('corpusName',document.uploadForm.newCorpus.value);
			console.log("Delete box is "+document.uploadForm.deleteFirst.checked);
			document.uploadForm.newCorpus.disabled=true;
			document.uploadForm.deleteFirst.disabled=true;
			document.uploadForm.uploadButton.disabled=true;
			document.uploadForm.corpusList.disabled=true;
	    	if (document.uploadForm.deleteFirst.checked) //should not be checked if new corpus typed in
	    		{
	    		removeCorpus(document.uploadForm.newCorpus.value)
		    	makeCorpus(document.uploadForm.newCorpus.value);	
	    		}
	    	else if (!corpusExists(document.uploadForm.newCorpus.value)) //only if new corpus typed in
	    		{
		    	makeCorpus(document.uploadForm.newCorpus.value);	
	    		}
	    	loadCorpus(document.uploadForm.newCorpus.value);
	    	Session.set('state','completed');
	    	}
    	},
  	  
   	 'change .half-width-input':function(e,template)
   	 	{
   		console.log("Selected file "+e.target.value);
   		document.uploadForm.uploadButton.disabled=(e.target.value.length<1);
		document.getElementById("zipButton").childNodes[0].nodeValue="Upload Zip";
		Session.set('buttonAction','upload');
    	Session.set('state','pre-upload');
   	 	},
   	 	
   	 'click .half-width-input':function(e,template)
   	 	{
   		document.uploadForm.uploadButton.disabled=true;
		document.getElementById("zipButton").childNodes[0].nodeValue="Upload Zip";
		Session.set('buttonAction','upload');
   		Session.set('zipResults',null);
    	Session.set('state','pre-upload');
   	 	},
    	  
  	 'change #newCorpus':function(e,template)
  	 	{
  		console.log("Selected corpus "+e.target.value);
  		var exists=corpusExists(e.target.value);
  		document.uploadForm.deleteFirst.disabled=!exists;
  		document.uploadForm.deleteFirst.checked=exists;
  		document.getElementById("zipButton").childNodes[0].nodeValue=(exists?"Update Corpus":"Create Corpus"); 
  		},

  	'submit form': function(e, template) {
   	    e.preventDefault();
   	  }

  });
  
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
  });
  

}
