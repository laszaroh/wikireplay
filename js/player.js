/*
 * DOMParser HTML extension
 * 2012-09-04
 * 
 * By Eli Grey, http://eligrey.com
 * Public domain.
 * NO WARRANTY EXPRESSED OR IMPLIED. USE AT YOUR OWN RISK.
 */

/*! @source https://gist.github.com/1129031 */
/*global document, DOMParser*/

(function(DOMParser) {
	"use strict";

	var
	  DOMParser_proto = DOMParser.prototype
	, real_parseFromString = DOMParser_proto.parseFromString
	;

	// Firefox/Opera/IE throw errors on unsupported types
	try {
		// WebKit returns null on unsupported types
		if ((new DOMParser).parseFromString("", "text/html")) {
			// text/html parsing is natively supported
			return;
		}
	} catch (ex) {}

	DOMParser_proto.parseFromString = function(markup, type) {
		if (/^\s*text\/html\s*(?:;|$)/i.test(type)) {
			var
			  doc = document.implementation.createHTMLDocument("")
			;
	      		if (markup.toLowerCase().indexOf('<!doctype') > -1) {
        			doc.documentElement.innerHTML = markup;
      			}
      			else {
        			doc.body.innerHTML = markup;
      			}
			return doc;
		} else {
			return real_parseFromString.apply(this, arguments);
		}
	};
}(DOMParser));

function playback(){
	var listOfRevisions = [], pageTitle, startRev, endRev, revisionInfo, modifyList;
	var playAnimation = true;
	this.animationSpeed = 500;
	var usingLanguageNamespace = 'en';
	var modifyList =[];
	var revisionListDict = {
		'format': 'json',
		'action': 'query',
		'prop': 'revisions',
		'rvprop': 'ids|user|timestamp|size|flags',
		'rvdir': 'newer',
	};
	
	var compareRevisionDict = {
		'format': 'json',
		'action': 'query',
		'prop': 'revisions',
		'rvprop': 'content',
		'rvexpandtemplates': '',
		'rvparse': '',
	};
	
	var baseUrl = 'https://en.wikipedia.org/w/api.php?callback=?';
	var that = this;
	this.wikiNameSpace = function (language) {
	  usingLanguageNamespace = language;
	  baseUrl = 'https://'+language+'.wikipedia.org/w/api.php?callback=?';
	};
	
	this.getRevisions = function (page,selectedEdits){

			listOfRevisions = selectedEdits;
	        pageTitle = page;
	        startRev = listOfRevisions.shift().revid;
	        revisionInfo = listOfRevisions[0];
	        endRev = revisionInfo.revid;
	        listOfRevisions.shift();
	        playAnimation = true;
	        that.wikiDiff();
       
	};
	/** Caching the results memoization **/
	var hashTable = hashTable || {};
	function getRequest(revid){
		var deferredReady = $.Deferred();
		if (revid in hashTable){
			//console.log('cache hit', revid);
			deferredReady.resolve();
			return deferredReady.promise();
		}
		else{
			//console.log('cache fail',revid );
			compareRevisionDict['revids'] = revid;
			return $.getJSON(baseUrl,compareRevisionDict,function(data){
				var resultKey = Object.keys(data.query.pages);
				var dataRev = data.query.pages[resultKey].revisions[0]['*'];
				hashTable[revid] = dataRev;
			});
		}
	};
	
	var empty = function (list){
		var l =[];
		for (ll in list ){
			if (!$(list[ll]).is(':empty')){
				l.push(list[ll]);
				}
		} 
		return l;
	};
	
	/*Serialise to valid xml*/
	var domParser = new DOMParser();
	var xmlSerialise = new XMLSerializer();
	var htmlToXml = function(str){
		var html = domParser.parseFromString(str, "text/html");
		var str = xmlSerialise.serializeToString(html.querySelector('body'));
		return str;
	};
	
	this.wikiDiff = function(){
	    //Creating the info box about the revisions
        var revInfo = {
				'title': pageTitle,
				'revid': revisionInfo.revid,
				'user': revisionInfo.user,
				'timestamp': revisionInfo.timestamp.slice(0,10),
				'anon': revisionInfo.hasOwnProperty('anon')? 'anon' : null,
				'minor': revisionInfo.hasOwnProperty('minor')? 'minor' : null
		};
		that.infoBox(revInfo);
		$.when(getRequest(startRev),getRequest(endRev)).done(function(){
			//wrapping the html fragment to form a valid xml
			var dataFirstRev  = htmlToXml(hashTable[startRev]);
			var dataSecondRev = htmlToXml(hashTable[endRev]);
			//var modifiedHtml = diff(dataFirstRev,dataSecondRev);
			console.time('Total diffing');
			var htmlDiffs = delta.Diff(dataFirstRev,dataSecondRev);
			console.timeEnd('Total diffing');
			console.time('annotate');
			var modifiedHtml = delta.annotate(htmlDiffs[1],htmlDiffs[0].matching,false,htmlDiffs[0]);
			console.timeEnd('annotate');
			console.time('addingHtml');
			//$('#wikiBody').html(convert(modifiedHtml));
			$('#wikiBody').html(modifiedHtml);
			console.timeEnd('addingHtml');
			console.time('making array');
			modifyList = empty($.makeArray($('del,ins')));
			console.timeEnd('making array');
			that.animateDiff();
		});		
	};
	
	this.infoBox = function (revInfo){
        $('.infoBox').html('');
        for (key in revInfo){                   
            if(key == 'revid'){
                var urlBase = 'https://'+usingLanguageNamespace+'.wikipedia.org/w/index.php?oldid='+revInfo[key];
                var anchor =$('<a>'+revInfo[key]+'</a>').attr({'target':'_blank','href':urlBase});
                 $('.infoBox').append(anchor);
            }
            else{
                $('.infoBox').append('<span>'+revInfo[key]+'</span>');
            }
        }
	};
	
	this.animateDiff = function () {
		if(playAnimation){
            setTimeout(function(){
                if(modifyList.length>0){
                    var element = modifyList[0];
                    //element.scrollIntoView(true);
                    //that.customScrollIntoView('#wikiBody',element);
                   
                    if ($(element).prop('tagName') == 'DEL'){
                        that.customScrollIntoView('#wikiBody',element);
                        $(element).fadeOut(that.animationSpeed);
                    }
                    else{
                        $(element).fadeIn(that.animationSpeed);
                         /* Temp fix for scroll into view */
                        //element.scrollIntoView(true);
                        that.customScrollIntoView('#wikiBody',element);
                    }
                    modifyList.shift();
                    that.animateDiff();
				}
                else{
                    if(listOfRevisions.length>0){
                        startRev = endRev;
                        revisionInfo = listOfRevisions.shift();
                        endRev = revisionInfo.revid;
                        $('body').trigger( "editAnimationBegins", [startRev] );
                        //setTimeout(wiki_diff,200);
                        that.wikiDiff();
                    }
                    else{
						$('#playButton').removeClass().addClass('play');
                    }
				}
			},that.animationSpeed);
		}
	};
	this.customScrollIntoView = function(parent,element){
		//console.log(' ',element,' ',element.offsetTop);
		$(parent).animate({scrollTop: element.offsetTop-10}, 300);
		//Remove the scroll plugin & write it 
		//$(element).scrollIntoView(250);
	};
	
	this.startPlayback = function(button){
		var page = $('#page_name').val();
	    var rev = $('#page_rev').val();
	    
	    
	    //Handling the case where the the player was paused
	    if(listOfRevisions.length > 0){
	        $(button).removeClass('play').addClass('pause');
	        playAnimation = true;
	        that.animateDiff();
	    }
	    else{
	        that.getRevisions(page,rev); 
	    }
	};
	
	this.pausePlayback = function(button){
		$(button).removeClass('pause').addClass('play');
		$('del,ins').finish();
		playAnimation = false;
	};
	//Attaching control for play / pause
	this.playbackControl  = function(){
		$('#playButton').click(function(){
			var button = this;
			if($(button).hasClass('play')){
				that.startPlayback(button);		    
			}
			else{
				that.pausePlayback(button);
			}
		});
	};
};

function addLanguageOptions(languages){
	for(language in languages){
		var option = $('<option>').val(language).html(languages[language]);
		$('select.languageNamespace').append(option);
	}
};

//The fullscreen Api handling
function fullscreenApi(screen){
	var elem = $(screen).get(0);
	if (elem.requestFullscreen) {
		elem.requestFullscreen();
	} 
	else if (elem.mozRequestFullScreen) {
		elem.mozRequestFullScreen();
	} 
	else if (elem.webkitRequestFullscreen) {
		elem.webkitRequestFullscreen();
	}
};