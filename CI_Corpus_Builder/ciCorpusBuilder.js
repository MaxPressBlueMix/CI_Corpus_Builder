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
				document.getElementById("zipButton").childNodes[0].nodeValue="Add Documents";
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

		var existing=corpusExists(document.uploadForm.newCorpus.value);
		document.uploadForm.deleteButton.disabled=!existing;
		document.uploadForm.addButton.disabled=existing;
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
//	console.log("Corpus "+corpname+(existing?" exists":" does not exist")+" in the list");
	return existing;
	}

function removeCorpus(corpusName)
	{
	if (confirm("Delete corpus "+corpusName+"?"))
		{
		console.log("Removing corpus "+corpusName);
		Session.set('status','processing');
		Session.set('statusReason','Working...');
		Meteor.call("removeCorpus", corpusName, function(err, response) 
			{
			if (err)
				{
				console.log("removeCorpus err: ");
				console.log(err);
				Session.set('status','error');
				Session.set('statusReason',"Remove failed. See logs."); //"err" shows as "[object Object]"
				}
			else if (response)
				{
				console.log("removeCorpus response is ");
				console.log(response);
				}
			else
				{
				console.log("removeCorpus response is "+response);
				Session.set('status','borked');
				Session.set('statusReason','Unexpected error during delete. See logs.');
				}
			getCorpusList();
	    	Session.set('state','deleted');
			});
		}
	}

function makeCorpus(corpusName)
	{
	console.log("Creating corpus "+corpusName);
	Session.set('status','processing');
	Session.set('statusReason','Working...');
	Session.set('state','adding');
	Meteor.call("createCorpus", corpusName, function(err, response) 
		{
		if (err)
			{
			console.log("makeCorpus err: ");
			console.log(err);
			Session.set('status','error');
			Session.set('statusReason',"Add failed. See logs."); //"err" shows as "[object Object]"
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
			Session.set('statusReason','Unexpected add error. See logs.');
			}
		getCorpusList();
    	Session.set('state','added');
		});
	}

function loadCorpus(corpusName)
{
console.log("Loading corpus "+corpusName);
Session.set('status','processing');
Session.set('statusReason','Working...');
Session.set('state','loading');
document.uploadForm.newCorpus.disabled=true;
document.uploadForm.deleteButton.disabled=true;
document.uploadForm.uploadButton.disabled=true;
document.uploadForm.corpusList.disabled=true;
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
		document.uploadForm.newCorpus.disabled=false;
		document.uploadForm.deleteButton.disabled=false;
		document.uploadForm.uploadButton.disabled=true;
		document.uploadForm.corpusList.disabled=false;
		}
	else
		{
		console.log("loadCorpus response is "+response);
		Session.set('status','borked');
		Session.set('statusReason','Unexpected error. See logs.');
		}
	});
}

function corpusChanged(e,template)
	{
	console.log("Selected corpus "+e.target.value);
	var exists=corpusExists(e.target.value);
	console.log("document.uploadForm.addButton.disabled is "+document.uploadForm.addButton.disabled);
	document.uploadForm.addButton.disabled=exists;
	document.uploadForm.deleteButton.disabled=!exists;
//	document.getElementById("zipButton").childNodes[0].nodeValue=(exists?"Update Corpus":"Create Corpus"); 
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
		getCorpusList();
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
		},
		
	"corpusName":function()
		{
		return Session.get('corpusName');
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
	  	
	  'click #addButton': function (e,template)
		{
		console.log("Clicked Add Corpus button");
		Session.set('status','processing');
		Session.set('statusReason','Working...');
		e.preventDefault();
		e.stopPropagation();
		makeCorpus(document.uploadForm.newCorpus.value);
		Session.set('status','ok');
		Session.set('statusReason','OK');
		},

	  'click #deleteButton': function (e,template)
		{
		console.log("Clicked Delete Corpus button");
		Session.set('status','processing');
		Session.set('statusReason','Working...');
		e.preventDefault();
		e.stopPropagation();
		removeCorpus(document.uploadForm.newCorpus.value);
		Session.set('status','ok');
		Session.set('statusReason','OK');
		},

	  
	  'click #zipButton': function (e,template) 
	  	{
    	Session.set('status','processing');
    	Session.set('statusReason','Working...');
    	Session.set('state','uploading');
	    e.preventDefault();
	    e.stopPropagation();
	    if (Session.get('buttonAction')=='upload') //send zip
	    	{
		    var file = template.find('.half-width-input').files[0];
		    if (file==null)
		    	{
		    	alert("No file selected!");
		    	}
		    else
		    	{
			    var reader = new FileReader();
			    reader.onload=function(event)
			    	{
			    	var data=event.target.result;
			    	var sfFile=EJSON.stringify(data);
			    	var sent=sendZip(sfFile);
					Session.set('corpusName',document.uploadForm.newCorpus.value);
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
	    	}
	    else //load
	    	{
	    	Session.set('state','creating');
			Session.set('zipResults',''); //clear the zips section
			Session.set('corpusName',document.uploadForm.newCorpus.value);
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
    	  
  	 'keyup #newCorpus':function(e,template)
  	 	{
  		corpusChanged(e,template);
  		},

  	 'change #corpusList':function(e,template)
   	 	{
 		var theinput = document.getElementById('newCorpus');
		var idx = document.uploadForm.corpusList.selectedIndex;
		var content = document.uploadForm.corpusList.options[idx].innerHTML;
		theinput.value = content;
		document.uploadForm.addButton.disabled=true;
		document.uploadForm.deleteButton.disabled=false;
   		corpusChanged(e,template);
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
