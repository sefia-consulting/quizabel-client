var reverseGeocodeAPIKey = '9f303e22bd843d355107',
	accessCodeBaseUrl = 'https://gxffk1lnf4.execute-api.us-east-1.amazonaws.com/dev/accessCode/',
	quizBaseUrl = 'https://9jxch42319.execute-api.us-east-1.amazonaws.com/dev/quiz/',
	totalsBaseUrl = 'https://0bazdhmlk9.execute-api.us-east-1.amazonaws.com/dev/totals/',
	resultBaseUrl = 'https://ulznycrzqi.execute-api.us-east-1.amazonaws.com/dev/result/';

var decisionTree,
	decision = { // need user data
		code:null,
		notes:null,
		contextToken:null,
		contextDisplay:null,
		code:null,
		finishMessages: [],
		responses: []
	},
	currentQuestion,
	allResponses = {},
	inited = false,
	notifyObj;

function makeId() {
	var text = "";
	var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
	for (var i = 0; i < 9; i++)
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	return text;
}

function initPlayer(loaded) {
	if (inited) return;
	updateDecision();
	if (!decision.finished && decision.lastQuestion) {
		currentQuestion = decisionTree.questions[decision.lastQuestion];
	}
	else if (decision.contextToken) {
		nextQuestion(null);
	}
	var c = decision && (decision.timeExpired || (decision.finished != null && decision.finished != undefined));
	var timeout = loaded ? 0 : 1000;
	var timeoutID = setTimeout(function() {
		$('#loading-container').fadeOut('slow', 'linear', function() {
			$('.decision-container').fadeIn('slow');
			if (c) {
				var key = "decision:progress:"+decisionTree.id,
					key2 = "decision:responses:"+decisionTree.id;
				localStorage.removeItem(key);
				localStorage.removeItem(key2);				
			}
			updateUI({completed:c, init:true});
		});
	}, timeout);
	inited = true;
}

function checkForUncommittedDecision(id) {
	// dev
	//if (true) return false;
	var rtn = false;
	$(document).on('click', '.load-btn,.no-load-btn', function() {
		var key = "decision:progress:"+id,
			key2 = "decision:responses:"+id,
			loaded = false;
		if ($(this).hasClass('load-btn')) {
			var decisionJSON = localStorage.getItem(key),
				allResponsesJSON = localStorage.getItem(key2);
			if (decisionJSON) {
				decision = JSON.parse(decisionJSON);
				decision.started = new Date(); // reset the started
				console.log(decision);
			}
			if (allResponsesJSON) {
				allResponses = JSON.parse(allResponsesJSON);
			}
			loaded = true;
		}
		else {
			localStorage.removeItem(key);
			localStorage.removeItem(key2);
		}
		notifyObj.close();
		initPlayer(loaded);
	});
	if (typeof(Storage) !== "undefined") {
		var key = "decision:progress:"+id,
			key2 = "decision:responses:"+id;
		var decisionJSON = localStorage.getItem(key),
			allResponsesJSON = localStorage.getItem(key2);
		if (decisionJSON || allResponsesJSON) {
			var message = '<div>We found an unsaved decision for this decision tree. Would you like to load it?</div><div class="text-center"><button class="btn btn-primary load-btn">Yes</button>&nbsp;<button class="btn btn-primary no-load-btn">No</button></div>';
			notifyObj = $.notify(message, {
				allow_dismiss: false,
				placement: {
					from:'top',
					align:'center'
				},
				delay:0
			});
		}
		else {
			initPlayer(false);
		}
	}
	else {
		initPlayer(false);
	}
	return;
}

function updateDecision() {
	decision.name = decisionTree.name;
	decision.quizId = decisionTree.id;
	decision.welcomeMessage = decisionTree.welcomeMessage;
	decision.finishMessage = decisionTree.finishMessage;
	decision.description = decisionTree.description;
	decision.allowRestart = decisionTree.allowRestart;
	decision.firstStarted = decision.firstStarted || new Date().getTime();	
	decision.started = decision.started || (new Date().getTime() - (decision.elapsed || 0));	
	fetchLocation(function(data) {
		updateLocation(data);
	});
	// get user info
}

function updateLocation(data) {
	data = data || {};
	decision.city = data.city;
	decision.county = data.county;
	decision.state = data.state;
	decision.postalCode = data.postalCode;
	decision.country = data.country;
	decision.countryCode = data.countryCode;
	decision.latitude = data.latitude;
	decision.longitude = data.longitude;
}

function fetchLocation(callback) {
	$.get('https://freegeoip.net/json/', function(ipData){
		$.get('https://osm1.unwiredlabs.com/locationiq/v1/reverse.php?format=json&key='+reverseGeocodeAPIKey+'&lat='+ipData.latitude+'&lon='+ipData.longitude, function(data) {
			console.log(data);
			data.address.latitude = data.lat;
			data.address.longitude = data.lon;
			data.address.city = data.address.hamlet;
			data.address.countryCode = data.address.country_code;
			data.address.postalCode = data.address.postcode;
			callback(data.address);
		});
	});
}

function loadDecisionTree(id) {
	$.ajax({
		type: "GET",
		url: quizBaseUrl+id,
		dataType: "json",
		success: function(returnData){
			console.log(returnData);
			if (returnData.id) {
				decisionTree = returnData;
				if (decisionTree.requireLogin && !returnData.loggedIn) {
					document.location.href = '/login.html?redirectUrl='+encodeURIComponent(document.location.href);
					return;
				}
				if (decisionTree.theme) {
					$('head').append('<link rel="stylesheet" href="/css/'+decisionTree.theme+'" type="text/css" />');
				}				

				if (decisionTree.saveUncommitted) {
					checkForUncommittedDecision(decisionTree.id);
				}
				else {
					initPlayer(false);
				}
			}
			else {
				alert(returnData.message || 'Eek could not load decision tree');
			}
		},
		error: function(jxrq, status, errMsg) {
			$.notify({
				message: 'Unable to load data:'+errMsg 
			},{
				placement: {
					from: "top",
					align: "center"
				},
				delay:3000,
				type: 'danger'
			});
		}
	});	
}

function validateAccessCode(code, callback) {
	var rtn;
	$.ajax({
		type: "GET",
		url: accessCodeBaseUrl+"validate/"+decisionTree.id+'?ac='+encodeURIComponent(code),
		dataType: "json",
		success: function(returnData){
			callback(returnData);
		},
		error: function(xrq, status, errMsg) {
			callback({message: errMsg, success:false, level:'danger'});
		}
	});	
}

$(document).ready(function() {
	initHandlers();
	var id = document.location.hash;
	id = id ? id.substring(1) : null;
	if (!id) {
		alert('Quiz Id not specified');
	}
	else {
		loadDecisionTree(id);		
	}
});

function populateFinishMessages() {
	decision.finishMessages = [];
	if (decision.finishMessage) decision.finishMessages.push(decision.finishMessage);
	$.each(decision.responses, function(i, r) {
		if (r.finishMessage) decision.finishMessages.push(r.finishMessage);
		if (r.answers) {
			$.each(r.answers, function(ii, a) {
				if (a.finishMessage) decision.finishMessages.push(a.finishMessage);
			});
		}
	});
}

function commitDecisionLocal(callback) {
	// need to post this up
	if (typeof(Storage) !== "undefined") {
		var id = decision.id,
			rando = makeId();
		localStorage.setItem('decision:'+id+':'+rando, JSON.stringify(decision));
	}
	if (callback) callback();
}

function completeDecision(lastCode) {
	var lastQuestion = decisionTree.questions[lastCode],
		response = findResponseByQuestion(lastQuestion),
		destinationInfo = getDestinationInfo(response);
	decision.finished = decision.finished || new Date().getTime();
	decision.totalTime = decision.finished - (decision.started || decision.finished);
	if (destinationInfo) {
		decision.destinationURI = destinationInfo.destinationURI
		decision.destinationQueryString = destinationInfo.queryString;
	}
	decision.totalResponses = decision.responses.length;
	decision.totalCorrect = 0;
	$.each(decision.responses, function(i, r) {
		if (r.correct) decision.totalCorrect++;
	});
	decision.totalCorrectPercentage = decision.totalCorrect/(decision.totalResponses||1) * 100;
	decision.totalPoints = 0;
	decision.totalCorrectPoints = 0;
	$.each(decision.responses, function(i, r) {
		decision.totalPoints += r.points;
		decision.totalCorrectPoints += r.correct ? r.points : 0;
	});
	decision.totalCorrectPointsPercentage = decision.totalCorrectPoints/(decision.totalPoints||1) * 100;
}

function commitDecision(callback) {
	console.log('Saving decision...');
	console.log(decision);
	var playerJSON = JSON.stringify(decision);
	$.ajax({
		type: "POST",
		url: resultBaseUrl+"create",
		data: playerJSON,
		contentType: "application/json; charset=utf-8",
		dataType: "json",
		success: function(data){
			console.log(data);
			//updateDecisionTreeForm();
			if (callback) callback(data);
		},
		error: function(xrq, status, errMsg) {
			if (callback) callback({success:false, message:errMsg});
		}
	});	
}


function cleanUp() {
	if (typeof(Storage) !== "undefined") {
		var id = decision.id,
			key = "decision:progress:"+id,
			key2 = "decision:responses:"+id;
		localStorage.removeItem(key);
		localStorage.removeItem(key2);
	}
}

function handleChange(event, changeType, question, prevQuestion, suppressState) {
	//console.log(changeType);
	if (changeType == 'finish') {
		try {
			clearQuestionTimer();
			console.log('pausing...');
			$('#decision-timer').timer('pause');
		}
		catch (e) {
			console.log(e);
		}
		decision.finished = new Date().getTime();
		populateFinishMessages();
		$(document).trigger('player.change',['decision.changed', null, null]);
		updateUI({finished:true, finalQuestion: question, previousQuestion:prevQuestion});
		if (suppressState != true) history.pushState('finish', null, document.location.pathname+"#finish");
	}
	else if (changeType == 'finish-timer-expired') {
		decision.finished = new Date().getTime();
		decision.timeExpired = true;
		populateFinishMessages();
		completeDecision();
		$(document).trigger('player.change',['decision.changed', null, null]);
		updateUI({finished:true, finalQuestion: question, previousQuestion:prevQuestion});
		if (suppressState != true) history.pushState('finish', null, document.location.pathname+"#finish");
	}
	else if (changeType == 'complete') {
		var lastCode = $('#complete-button').data('previous-question-code');
		completeDecision(lastCode);
		commitDecision(function(data) {
			if (data.success) {
				cleanUp();
				if (decision.destinationURI) {
					var delim = '?'
					if (decision.destinationURI.indexOf('?') > 0) delim = '&';
					var qs = delim+'_d='+data.code+'&_t='+data.decisionTreeCode,
						finalQs = qs+'&'+decision.destinationQueryString;					
					//alert(decision.destinationURI+finalQs);
					//console.log(decision.destinationURI+finalQs);
					document.location.href = decision.destinationURI+finalQs;
				}
				else {
					if (suppressState != true) history.pushState('complete', null, document.location.pathname+"#complete");
					updateUI({completed:true});
				}
			}
			else alert(data.message);
		});
	}
	else if (changeType == 'question.changed') {
		decision.finished = null;
		decision.duration = null;
		updateUI({previousQuestion:prevQuestion});
		if (suppressState != true) history.pushState(currentQuestion, null, document.location.pathname+"#"+currentQuestion.code);
	}
	else if (changeType == 'decision.changed') {
		saveProgress();
	}
}

function isFirstQuestion(q) {
	var qCode = q.code,
		found = false;
	for (var k2 in decisionTree.links) { //look for link to
		var l = decisionTree.links[k2];
		if (l.toQuestion == qCode) {
			found = true;
			break;
		}
	}
	return !found;
}

function getDestinationInfo(response) {
	var rtn = false;
	if (response) {
		if (response.questionType != 'singleMultipleChoice') {
			if (response.destinationURI) {
				rtn = {
					destinationURI: response.destinationURI,
					json: (response.attributes ? response.attributes['destination.json'] == 'true' : false),
					base64Encode: (response.attributes ? response.attributes['destination.base64Encode'] == 'true' : false),
					method: (response.attributes ? response.attributes['destination.method'] : 'get')
				};
			}
		}
		else {
			$.each(response.answers, function(i, a) {
				if (a.selected && a.destinationURI) {
					rtn = {
						destinationURI: a.destinationURI,
						json: (a.attributes ? a.attributes['destination.json'] == 'true' : false),
						base64Encode: (a.attributes ? a.attributes['destination.base64Encode'] == 'true' : false),
						method: (a.attributes ? a.attributes['destination.method'] : 'get')
					};
					return false;
				}
			});
		}
		if (rtn) { // loop through response to build parameters
			rtn.parameters = {};
			rtn.extraQueryStrings = [];
			$.each(decision.responses, function(i, r) {
				var k = r.code;
				if (r.attributes && r.attributes['destination.parameter']) {
					k = r.attributes['destination.parameter'];
				}
				rtn.parameters[k] = r.value;
				if (r.attributes && r.attributes['destination.extraQueryString']) {
					rtn.extraQueryStrings.push(r.attributes['destination.extraQueryString'])
				}
				$.each(r.answers, function(ii, a) {
					if (a.selected &&  a.attributes && a.attributes['destination.extraQueryString']) {
						rtn.extraQueryStrings.push(a.attributes['destination.extraQueryString'])
					}
				});
			})
			var qs = '';
			if (rtn.parameters) {
				if (rtn.json) {
					var jsn = JSON.stringify(rtn.parameters);
					if (rtn.base64Encode) jsn = window.btoa(jsn);
					qs += ('_p='+ encodeURIComponent(jsn));
				}
				else {
					var prms = rtn.parameters;
					if (rtn.base64Encode) {
						prms = {};
						for (var k1 in rtn.parameters) {
							prms[k1] = window.btoa(rtn.parameters[k1]);
						}
					}
					qs += $.param(prms);
				}
			}
			$.each(rtn.extraQueryStrings, function(ii, eqs) {
				if (eqs.indexOf('&') == 0 || eqs.indexOf('?') == 0) eqs = eqs.substring(0);
				if (qs) qs += '&';
				qs += eqs;
			});
			//alert(destinationInfo.destinationURI+qs);
			//console.log(destinationInfo.destinationURI+qs);
			rtn.queryString = qs;			
		}
	}
	return rtn;
}

function handleResponse() {
	var response = saveResponse();
	if (typeof response == 'string') {
		//something went off
		updateUI({message:response,level:'danger'});
	}
	else {
		if (response.questionType != 'singleMultipleChoice')
			nextQuestion(currentQuestion.code, 'question');
		else {
			$.each(response.answers, function(i, a) {
				if (a.selected) {
					nextQuestion(a.code, 'answer');
					return false;
				}
			});
		}
	}
	return response;
}

function handleNoResponse(prms) {
	prms = prms || {};
	var response = saveResponse({noAnswer:true, timeExpired:(prms.timeExpired == true || prms.decisionTimerExpired == true)});
	if (prms.decisionTimerExpired == true) {
		var prevQuestion = currentQuestion;
		currentQuestion = null;
		$(document).trigger('player.change',['finish-timer-expired',prevQuestion, prevQuestion]);
	}
	else {
		nextQuestion(currentQuestion.code, 'question', true);
	}
	return response;
}

function initHandlers() {
	$('#start-button').on('click', function() {
		if (decisionTree.contextTokenMode == 'Context Token Supported' || 
			decisionTree.contextTokenMode == 'Context Token Required') {
			var token = $('#contextToken').val();
			if (!token && decisionTree.contextTokenMode == 'Context Token Required') {
				updateUI({message:'Access code required', level:'danger'});
				return;
			}
			if (token) {
				validateAccessCode(token, function(rtn) {
					if (rtn.success) {
						decision.contextToken = rtn.contextToken
						decision.contextDisplay = rtn.contextDisplay
						decision.domainId = rtn.domainId
						decision.domainClass = rtn.domainClass
						decision.contextTokenValidated = new Date().getTime()
						saveProgress();
						nextQuestion(null);
					}
					else {
						updateUI({message:(rtn.message || 'Invalid access code'), level:(rtn.level || 'danger')});
						return;
					}
				});
				return;
			}
		}
		nextQuestion(null);
	});
	$('#restart-link').on('click', function() {
		nextQuestion(null);
		$('#decision-timer').timer('resume');
		updateUI({started:true});
	});
	$('#back-link').on('click', function() {
		if (!decision.timeExpired) {
			window.history.back();
		}
	});
	$('#skip-link').on('click', handleNoResponse);
	$('#retake-link').on('click', function() {	
		cleanUp();
		location.reload();
	});
	$('#complete-button').on('click', function() {
		$(document).trigger('player.change',['complete']);
	});
	$(document).on('click touch', '.single-choice-answer-btn,#short-answer-submit,#scale-submit,#multiple-choice-submit', handleResponse);
	$('#short-answer-text').on('keypress', function() {
		if (event.keyCode == 13) $('#short-answer-submit').click();
	});
	$('#timer-modal-continue').on('click touch',function() {
		$(this).parents('.modal').modal('hide');
		//alert($('#decision-timer').data('state'));
		var decisionTimerExpired = $('#decision-timer').data('state') == 'stopped';
		if (decisionTimerExpired) {
			var response = handleNoResponse({decisionTimerExpired:true});
		}
		else {
			var response = handleNoResponse({timeExpired:true});
		}
	});
	$(document).on('player.change', handleChange);
	$(document).on('click','.multiple-choice-answer-btn', function() {
		var jqThis = $(this);
		if (jqThis.find('input[name="answerCode"]:checked').length == 0) {
			var maxAnswers = currentQuestion.attributes['designer.maxAnswers'];
			if (maxAnswers) {
				maxAnswers = parseInt(maxAnswers);
				var currentSelectedQuestions = $('.multiple-choice-answer-btn>input[name="answerCode"]:checked').length;
				if (maxAnswers > 0 && currentSelectedQuestions >= maxAnswers) {
					$.notify({
						message: 'Please limit your choices to '+maxAnswers
					},{
						placement: {
							from: "top",
							align: "center"
						},
						delay:1000,
						type: 'warning'
					});

					return false;
				}
			}
		}
	});
	window.addEventListener('popstate', function(e) {
		var q = e.state;
		if (!q.allowBack && decision && decision.finished) {
			$(document).trigger('player.change',['complete', null, null, true]);;
			return;
		}
		//console.log(e);
		//console.log(q);
		if (q == 'finish' || q == 'complete') { // finished
			currentQuestion = null;
			$(document).trigger('player.change',[q, null, null, true]);;
		}
		else {//if(decisionTree.allowBack) {//start
			currentQuestion = q;
			$(document).trigger('player.change',['question.changed', currentQuestion, null, true]);;
		}
	  // e.state is equal to the data-attribute of the last image we clicked
	});
}

function saveProgress() {
	decision.ts = new Date().getTime();
	decision.elapsed = decision.ts - (decision.started || decision.ts);
	if (currentQuestion) decision.lastQuestion = currentQuestion.code;
	if (decisionTree.saveUncommitted && typeof(Storage) !== "undefined") {
		console.log(decision);
		var storageJSON = JSON.stringify(decision);
		localStorage.setItem("decision:progress:"+decisionTree.id, storageJSON);
		storageJSON = JSON.stringify(allResponses);
		localStorage.setItem("decision:responses:"+decisionTree.id, storageJSON);
	}
}

function findResponseByQuestion(q) {
	q = q || currentQuestion;
	var response;
	if (q) {
		$.each(decision.responses, function(i, r){
			if (r.code == q.code) {
				response = r;
				return false;
			}
		});		
	}
	return response;
}

function findAnswer(answerCode, q) {
	q = q || currentQuestion;
	var answer;
	for (var ak in q.answers) {
		if (ak == answerCode) {
			answer = q.answers[ak];
			break;
		}
		if (q.answers[ak].labels) {
			$.each(q.answers[ak].labels, function(ii, a2) {
				if (a2.code == answerCode) {
					answer = a2;
					return false;
				}
			});
			if (answer) break;
		}
	}
	return answer;
}

function isCorrect(r) {
	var rtn = true,
		q = decisionTree.questions[r.code];
	if (q.questionType == 'shortAnswer' || q.questionType == 'scale') {
		if (r.value && q.attributes['designer.validation']) {
			try {
				var patt = eval(q.attributes['designer.validation']);
				if (!patt.test(r.value)) rtn = false;
			}
			catch (e) {
				console.log('unable to validate answer');
				console.log(e);
				rtn = false;
			}
		}
		else {
			rtn = true
		}
	}
	else if (q.questionType == 'singleMultipleChoice') {
		if (r.answers.length == 0) rtn = false;
		else {
			$.each(r.answers, function(i, a1) {
				if (a1.correct != a1.selected) {
					rtn = false;
					return false;
				}
			});
		}
	}
	else if (q.questionType == 'multipleMultipleChoice') {
		$.each(r.answers, function(i, a1) {
			if (a1.correct != a1.selected) {
				rtn = false;
				return false;
			}
		});
	}
	return rtn;
}

function saveResponse(prms) {
	prms = prms || {};
	var response = findResponseByQuestion(currentQuestion),
		val;
	if (!response) {
		response = {
			code: currentQuestion.code,
			value: null,
			sequence: decision.responses.length,
			correct: null
		}
		decision.responses.push(response);
	}
	else if (decision.responses.length > response.sequence + 1) {
		// getting rid of subsequent responses
		decision.responses.splice(response.sequence+1, decision.responses.length - (response.sequence+1));
	}
	response.displayText = currentQuestion.displayText;
	response.finishMessage = currentQuestion.finishMessage;
	response.points = currentQuestion.points != null && currentQuestion.points != undefined ? currentQuestion.points : 1;
	response.timeLimit = currentQuestion.timeLimit
	response.timeExpired = prms.timeExpired == true;
	response.imageURI = currentQuestion.imageURI;
	response.destinationURI = currentQuestion.destinationURI;
	response.questionType = currentQuestion.questionType;
	response.answerRequired = currentQuestion.answerRequired;
	response.allowBack = currentQuestion.allowBack;
	response.attributes = currentQuestion.attributes;
	response.ts = new Date().getTime();

	if (currentQuestion.questionType == 'shortAnswer') {
		response.value = $('#short-answer-text').val().trim();
		if (currentQuestion.answerRequired && !response.value) {
			response = 'Answer required';
		}
		else {
			response.correct = isCorrect(response);
		}
	}
	else if (currentQuestion.questionType == 'scale') {
		response.value = $('#scale-value').rating('rate');
		if (currentQuestion.answerRequired && !response.value) {
			response = 'Answer required';
		}
		else {
			response.correct = isCorrect(response);
		}
	}
	else if (currentQuestion.questionType == 'singleMultipleChoice') {
		response.answers = [];
		var target = prms.noAnswer != true ? $(event.target).closest('.single-choice-answer-btn') : {}, // could be skip link
			answerCode = prms.noAnswer != true ? target.attr('data-answer-code') : '~',
			found = false;
		for (var k in currentQuestion.answers) {
			var qAnswer = currentQuestion.answers[k],
				answer = {
				displayText: qAnswer.label,
				correct: qAnswer.correct,
				displayIndex: qAnswer.displayIndex,
				code: qAnswer.code,
				value: qAnswer.value,
				imageURI: qAnswer.imageURI,
				moreInfoURI: qAnswer.moreInfoURI,
				destinationURI: qAnswer.destinationURI,
				finishMessage: qAnswer.finishMessage,
				attributes: qAnswer.attributes,
				selected: answerCode == qAnswer.code
			};
			if (answer.selected) {
				if (response.value) {
					response.value += (','+(qAnswer.value || qAnswer.label));
				}
				else {
					response.value = (qAnswer.value || qAnswer.label);
				}
			}
			found = found || answer.selected;
			response.answers.push(answer);
		}
		if (currentQuestion.answerRequired && !found) {
			response = 'Answer required';
		} else {
			response.correct = isCorrect(response);
		}
	}
	else if (currentQuestion.questionType == 'multipleMultipleChoice') {
		response.answers = [];
		var found = false;
		for (var k in currentQuestion.answers) {
			var qAnswer = currentQuestion.answers[k];
			$.each(qAnswer.labels, function(i,qMultiAnswer) {
				var answer = {
					displayText: qMultiAnswer.label,
					correct: qMultiAnswer.correct,
					displayIndex: qMultiAnswer.displayIndex,
					value: qMultiAnswer.value,
					imageURI: qMultiAnswer.imageURI,
					destinationURI: qMultiAnswer.destinationURI,
					code: qMultiAnswer.code,
					finishMessage: qMultiAnswer.finishMessage,
					attributes: qMultiAnswer.attributes,
					selected: $('[data-answer-code="'+qMultiAnswer.code+'"]').prop('checked')
				};
				if (answer.selected) {
					if (response.value) {
						response.value += (','+(qMultiAnswer.value || qMultiAnswer.label));
					}
					else {
						response.value = (qMultiAnswer.value || qMultiAnswer.label);
					}
				}				
				found = found || answer.selected;
				response.answers.push(answer);
			});
		}
		if (currentQuestion.answerRequired && !found) {
			response = 'Answer required';
		} else {
			response.correct = isCorrect(response);
		}
	}
	if (typeof(response) == 'object') {
		allResponses[currentQuestion.code] = response;
		$(document).trigger('player.change',['decision.changed',response.code]);
	}
	//response ='Poop';
	decision.finished = null	
	return response;
}

function fetchTotals(id, callback) {
	var rtn;
	$.ajax({
		type: "GET",
		url: totalsBaseUrl+"get/"+id,
		dataType: "json",
		success: function(returnData){
			callback(returnData);
		},
		error: function(xrq, status, errMsg) {
			callback({message: errMsg, success:false, level:'danger'});
		}
	});	
}

function paintCurrentQuestion(previousQuestion, started) {
	var first = isFirstQuestion(currentQuestion),
		questionContainer = $('#'+currentQuestion.questionType),
		response = findResponseByQuestion() || allResponses[currentQuestion.code];
	$('#question-container').show();
	$('#question-image').empty();
	if (currentQuestion.imageURI) {
		$('#question-image').append('<img src="'+currentQuestion.imageURI+'" class="img-responsive img-rounded" style="margin: 0 auto;"/>');
		$('#question-image').show();
	}
	$('#question-text').text(currentQuestion.displayText);
	if (currentQuestion.questionType == 'shortAnswer') {
		var v = null;
		if (response) v = response.value;
		$('#short-answer-text').val(v);
	}
	else if (currentQuestion.questionType == 'scale') {
		var v = 5,
			max = 10,
			min = 1,
			step = 1,
			symbol = 'glyphicon glyphicon-ok-sign',
			symbolEmpty = 'glyphicon glyphicon-ok-circle';
		if (response) v = response.value;
		else if (currentQuestion.attributes['designer.defaultValue']) {
			v = Math.round(parseInt(currentQuestion.attributes['designer.defaultValue']));
		}
		if (currentQuestion.attributes['designer.max']) max = Math.round(parseInt(currentQuestion.attributes['designer.max']));
		if (currentQuestion.attributes['designer.min']) min = Math.round(parseInt(currentQuestion.attributes['designer.min']));
		if (currentQuestion.attributes['designer.step']) max = Math.round(parseInt(currentQuestion.attributes['designer.step']));
		if (currentQuestion.attributes['designer.symbol']) symbol = currentQuestion.attributes['designer.symbol'];
		if (currentQuestion.attributes['designer.symbolEmpty']) symbolEmpty = currentQuestion.attributes['designer.symbolEmpty'];

		try {$('#scale-container').empty();}catch(e){}

		var ratingCfg = {
			id:'scale-value-id',
			filled: symbol+' scale-symbol scale-filled',
			empty: symbolEmpty+' scale-symbol scale-empty',
			stop:max,
			start:min - 1,
			step:step
		};
		console.log(ratingCfg);
		$('#scale-container').append('<input id="scale-value" type="hidden" name="scale-value"/>');
		$('#scale-value').rating(ratingCfg);
		$('#scale-value').rating('rate', v);
		$('#scale-left-label').text(currentQuestion.attributes['designer.leftLabel']);
		$('#scale-center-label').text(currentQuestion.attributes['designer.centerLabel']);
		$('#scale-right-label').text(currentQuestion.attributes['designer.rightLabel']);
	}
	else if (currentQuestion.questionType == 'singleMultipleChoice') {
		questionContainer.empty();
		var row = $('<div class="row single-choice-answer-row"></row>'),
			counter = 0;
		questionContainer.append(row);
		var sortedAnswers = Object.values(currentQuestion.answers);		
		sortedAnswers.sort(function(a,b) {
			if (a.displayIndex < b.displayIndex)
				return -1;
			if (a.displayIndex > b.displayIndex)
				return 1;
			return 0;
		});
		if (sortedAnswers.length ==2) {
			row.append('<div class="col-md-3">&nbsp;</div>');
		}
		else if (sortedAnswers.length ==3) {
			row.append('<div class="col-md-1">&nbsp;</div>');
		}
		$.each(sortedAnswers, function(i, answer){
			var btn = $('<button type="button" class="btn btn-default single-choice-answer-btn"></button>');
			btn.attr('data-answer-code', answer.code);
			btn.attr('data-question-code', currentQuestion.code);
			if (response && response.answers) {
				$.each(response.answers, function(i1, a1) {
					if (answer.code == a1.code && a1.selected) {
						btn.addClass('btn-primary');
					}
				});
			}
			if (answer.imageURI) {
				btn.append('<div class="answer-image"><img src="'+answer.imageURI+'" class="img-responsive img-rounded" style="margin: 0 auto;"/></div>');
			}
			btn.append(answer.label);
			var col = $('<div class="col-md-3"></div>');
			col.append(btn);
			row.append(col);
			counter++;
			if (counter%4 == 0 && counter < Object.keys(currentQuestion.answers).length) {
				row = $('<div class="row single-choice-answer-row"></row>');
				questionContainer.append(row);
			}
		});
	}
	else if (currentQuestion.questionType == 'multipleMultipleChoice') {
		var container = $('#multiple-choice-container');
		container.empty();

		var btnGroup = $('<div class="btn-group" data-toggle="buttons">');
		container.append(btnGroup);
		var sortedAnswers = Object.values(currentQuestion.answers);		
		sortedAnswers.sort(function(a,b) {
			if (a.displayIndex < b.displayIndex)
				return -1;
			if (a.displayIndex > b.displayIndex)
				return 1;
			return 0;
		});
		$.each(sortedAnswers, function(i, parentAnswer){
			$.each(parentAnswer.labels, function(j, answer) {
				var label = $('<label class="btn btn-default multiple-choice-answer-btn"></label>'),
					chkbox = $('<input type="checkbox" name="answerCode"></input>');
				chkbox.val(answer.code);
				chkbox.attr('data-answer-code', answer.code);
				chkbox.attr('data-question-code', currentQuestion.code);
				if (response && response.answers) {
					$.each(response.answers, function(i1,a1) {
						if (answer.code == a1.code && a1.selected) {
							label.addClass('active');
							chkbox.prop('checked', true);
							return false;
						}

					});
				}
				label.append(chkbox);
				if (answer.imageURI) {
					label.append('<div class="answer-image"><img src="'+answer.imageURI+'" class="img-responsive img-rounded" style="margin: 0 auto;"/></div>');
				}
				label.append(answer.label);
				btnGroup.append(label);
			});
		});
	}
	if (decisionTree.showPoints) {
		var p = currentQuestion.points != undefined && currentQuestion.points != null ? currentQuestion.points : 1;
		$('#question-points').text(p);
		$('#question-points-container').show();
	}

	if (currentQuestion.timeLimit) {
		$("#question-timer").show();
		$("#question-timer").progressTimer({
			timeLimit: currentQuestion.timeLimit,
			onFinish: function() {
				console.log('question timer expired');
				$('#timer-modal').modal({backdrop: 'static', keyboard: false})  
			}
		});
	}
	if (!first && decisionTree.allowRestart && !started) {
		$('#restart-link').show();

	}
	if (!first && previousQuestion && previousQuestion.allowBack && !started) {
		$('#back-link').show();
	}
	if (!currentQuestion.answerRequired) {
		$('#skip-link').show();
	}
	questionContainer.show();
}

function paintDecisionTimer() {

	if (decisionTree.timeLimit != null && decisionTree.timeLimit != undefined && decisionTree.timeLimit >= 0) {
		if (decision.finished) {
			$('#decision-timer').timer('pause');
		}
		else if ($('#decision-timer').data('state') != 'running') {
			if ($('#decision-timer').data('state') == 'paused') {
				$('#decision-timer').timer('resume');
			}
			else {
				try {
					$('#decision-timer').timer('remove'); 
				}
				catch (e) {
					console.log(e);
				}
				var timerCfg = {
					callback: function() {
						console.log('decision timer expired');
						clearQuestionTimer();
						$('#timer-modal').modal({backdrop: 'static', keyboard: false});
					}
				};
				if (decisionTree.timeLimit > 0) {
					timerCfg.countdown = true;
					var timeLimit = decisionTree.timeLimit;
					if (decision.elapsed) {
						timeLimit = timeLimit - Math.round(decision.elapsed/1000);
					}
					timerCfg.duration = timeLimit+'s';
				}
				$('#decision-timer').timer(timerCfg); //Same as $('#divId').timer('start')
			}
		}
		$('#decision-timer').show();
	}
	else {
		$('#decision-timer').hide();
	}
}

function getQuestionPieChartImageURI(questionData) {
	var chdl = '',
		chdlArr = [],
		q = decisionTree.questions[questionData.questionCode],
		ct = questionData.responseCount,
		rtn;
	$.each(questionData.answerData, function(iiii, it) {
		var rCt = it.responseCount;
		chdlArr.push( encodeURIComponent(it.answerText+' ('+Math.round(parseFloat((rCt/ct)*1000)/10)+'%)') );
	});
	chdl = chdlArr.join('|');
	var chdArr = [];
	$.each(questionData.answerData, function(iiii, it) {
		chdArr.push(it.responseCount);
	});
	var chd = chdArr.join(',')
	if (chd && chdl) {
		rtn = '<img src="https://chart.googleapis.com/chart?chdls=000000,11&chf=bg,s,ffffff&chco=337ab7&cht=p&chd=t:'+chd+'&chs=260x180&chdl='+chdl+'&chma=0,0,0,0"/>';
	}
	return rtn;
}

function getQuestionQuestionBarChartImageURI(questionData) {
	var chdl = '',
		chdlArr = [],
		q = decisionTree.questions[questionData.questionCode],
		ct = questionData.responseCount,
		totalVal = 0,
		rtn;
	$.each(questionData.answerData, function(iiii, it) {
		var rCt = it.responseCount;
		totalVal += parseInt(it.answerText) * Math.round(parseFloat((rCt/ct)*1000)/10);
		chdlArr.push( encodeURIComponent(it.answerText+' ('+Math.round(parseFloat((rCt/ct)*1000)/10)+'%)') );
	});
	chdl = chdlArr.join('|');
	var min = parseInt(q.attributes['designer.min'] || '1'),
		max = parseInt(q.attributes['designer.max'] || '10'),
		step = parseInt(q.attributes['designer.step'] || '1'),
		v = min,
		chxl= '0:|',
		chdArr = [];
	while (v < max) {
		var found = false,
			d = 0;
		$.each(questionData.answerData, function(iiii, it) {
			if (parseInt(it.answerText) == v) {
				d = it.responseCount;
				found = true;
				return false;
			}
		});
		chdArr.push(d);
		chxl += ('|'+v);
		v += step;
		if (v >= max) {
			v = max;
			chxl += ('|'+v);
			d = 0;
			$.each(questionData.answerData, function(iiii, it) {
				if (parseInt(it.answerText) == v) {
					d = it.responseCount;
					found = true;
					return false;
				}
			});
			chdArr.push(d);
			break;
		}
	}
	var chd = chdArr.join(',');
	if (chd && chdl) rtn = '<img src="https://chart.googleapis.com/chart?chxt=x&chdls=000000,11&chf=bg,s,ffffff&chco=337ab7&cht=bvs&chd=t:'+chd+'&chs=260x180&chdl='+chdl+'&chma=0,0,0,0&chbh=a&chds=0,20&chxl='+chxl+'"/>';
	return rtn;
}

function paintCompleted() {
	$('#completed-title').show();
	var jqSummary = $('#summary-container');
	jqSummary.empty();
	if (decisionTree.showCorrect) jqSummary.append('<div class="summary-correct">'+decision.totalCorrect+'/'+decision.totalResponses+' Correct</div>');
	if (decisionTree.showPoints) jqSummary.append('<div class="summary-points">'+decision.totalCorrectPoints+'/'+decision.totalPoints+' Points</div>');			
	if (decisionTree.showRecap || decisionTree.showTotals) {
		var jqRow;
		$.each(decision.responses, function(idx, r) {
			var jqCont = $('<div class="summary-item-container col-md-6"></div>'),
				jqItem = $('<div class="summary-item-panel"></div>');
			if (idx%2==0) {
				jqRow = $('<div class="summary-item-row row"></div>');
				jqRow.appendTo(jqSummary);
			}
			jqCont.append(jqItem);
			jqItem.append('<div class="summary-question-title">Prompt:</div>');
			if (r.imageURI) jqItem.append('<div><img class="summary-question-image img-responsive img-rounded" style="margin: 0 auto;max-width:180px" src="'+r.imageURI+'"/></div>');
			jqItem.append('<div class="summary-question-text">'+r.displayText+'</div>');
			if (decisionTree.showRecap) {
				if (r.answers) {
					var ansCont = $('<div class="summary-answers-container"></div>');
					ansCont.append('<div class="summary-answers-title">Answers:</div>');
					var found = false;
					$.each(r.answers, function(idx2, a) {
						if (a.selected) {
							if (a.imageURI) {
								ansCont.append('<div><img class="summary-question-image img-responsive img-rounded" style="margin: 0 auto;max-width:180px" src="'+a.imageURI+'"/></div>');
							}
							ansCont.append('<div class="summary-answer-text">'+a.displayText+'</div>');
							found = true;
						}
					});
					if (!found) {
						jqItem.append('<div class="summary-answer-text"><span>(no answer)</span></div>');

					}
					jqItem.append(ansCont);
				}
				else {
					jqItem.append('<div class="summary-answers-title">Answer:</div>');
					jqItem.append('<div class="summary-answer-text">'+(r.value || '<span>(no answer)</span>')+'</div>');
				}
			}
			if (r.timeExpired) jqItem.append('<div class="summary-timer-expired">Timer expired</div>');
			if (decisionTree.showCorrect) jqItem.append('<div class="summary-question-correct '+(r.correct?'correct':'incorrect')+ '">'+(r.correct?'Correct':'Incorrect')+'</div>');
			if (decisionTree.showPoints) jqItem.append('<div class="summary-question-points">'+(r.correct ? r.points : 0)+' Points</div>');
			if (decisionTree.showTotals) jqItem.append('<div class="summary-question-results" data-question-code="'+r.code+'"></div>');
			jqRow.append(jqCont);
		});
		$('#retake-link').show();
		jqSummary.show();
		if (decisionTree.showTotals) {
			fetchTotals(decision.quizId, function(results) {
				console.log(results);
				if (results.success) {
					$.each(results.questionsData, function(iii, questionData) {
						var q = decisionTree.questions[questionData.questionCode],
							chartDiv = $('div.summary-question-results[data-question-code="'+questionData.questionCode+'"]'),
							ct = questionData.responseCount;
						if (q.questionType == 'singleMultipleChoice' || q.questionType == 'multipleMultipleChoice') {
							var imageURI = getQuestionPieChartImageURI(questionData);
							if (imageURI) chartDiv.append(imageURI);
						}
						else if (q.questionType == 'scale') {
							var ct = questionData.responseCount,
								totalVal = 0;
							$.each(questionData.answerData, function(iiii, it) {
								var rCt = it.responseCount;
								totalVal += parseInt(it.answerText) * (Math.round(parseFloat((rCt/ct)*10))/10);
								console.log(parseInt(it.answerText) * (Math.round(parseFloat((rCt/ct)*10))/10));
							});
							chartDiv.append('<div class="summary-question-average-value">'+totalVal+' Average</div>');
							var imageURI = getQuestionQuestionBarChartImageURI(questionData);
							if (imageURI) chartDiv.append(imageURI);
						}
						else if (q.questionType == 'shortAnswer' && questionData.answerData) {
							questionData.answerData.sort(function(a,b) {
								if (a.responseCount > b.responseCount) return -1;
								if (a.responseCount < b.responseCount) return 1;
								return 0;
							});
							var theRest = 0, theRestResponseCount = 0, l = questionData.answerData.length;
							$.each(questionData.answerData, function(idx2, ans) {
								if (idx2 < 5 || (l == 6)) {
									var rCt = ans.responseCount,
										answerText = ans.answerText || '(blank)';
									chartDiv.append('<div class="short-answer-result">'+answerText +' ('+Math.round(parseFloat((rCt/ct)*1000)/10)+'%)</div>');
								}
								else {
									theRest++;
									theRestResponseCount += ans.responseCount;
								}
							});
							if (theRest) {
								chartDiv.append('<div class="short-answer-result">'+theRest +' others ('+Math.round(parseFloat((theRestResponseCount/ct)*1000)/10)+'%)</div>');
							}
						}
					});
				} 
			});
		}
	}	
}

function paintFinished(lastQuestion) {
	//console.log(lastQuestion);
	var jqFinish = $('#finish-message-container'),
		jqCompleteBtn = $('#complete-button');
	jqFinish.empty();
	$.each(decision.finishMessages, function(idx, msg) {
		jqFinish.append('<div class="finish-message">'+msg+'</div>');
	});	
	jqCompleteBtn.attr('data-previous-question-code', lastQuestion.code);
	jqCompleteBtn.show();
	jqFinish.show();
	var img = $('#decision-tree-image');
	img.empty();
	if (decisionTree.finishImageUri) {
		img.append('<div class="decision-image"><img src="'+decisionTree.finishImageUri+'" class="img-responsive img-rounded" style="margin: 0 auto;"/></div>');
		img.show();
	}
	if (lastQuestion.allowBack && !decision.timeExpired) {
		$('#back-link').show();
	}
	if (decisionTree.allowRestart) {
		$('#restart-link').show();
	}

}

function paintStart() {
	if (decisionTree.welcomeMessage) {
		$('#welcome-message').text(decisionTree.welcomeMessage);
		$('#welcome-message').show();
	}
	var img = $('#decision-tree-image');
	img.empty();
	if (decisionTree.imageUri) {
		img.append('<div class="decision-image"><img src="'+decisionTree.imageUri+'" class="img-responsive img-rounded" style="margin: 0 auto;"/></div>');
		img.show();
	}

	if (decisionTree.contextTokenMode == 'Context Token Supported' || 
		decisionTree.contextTokenMode == 'Context Token Required') {
		$('#access-code-container').show();
	}
	$('#start-container').show();
}

function paintHeader(msg, lvl) {
	// paint header info
	if (decisionTree.showName != false) {
		$('#decision-tree-name').text(decisionTree.name);
		$('#decision-tree-description').text(decisionTree.description);
		$('#decision-tree-name-container').show();
	}
	$('#contextToken').val(decision.contextToken);
	$('#context-display').text(decision.contextDisplay);
	if (decisionTree.showContext == true && decision.contextDisplay) {
		$('#context-container').show();
	}
	else if (decisionTree.contextTokenMode == 'Context Token Supported' &&
		decisionTree.contextTokenMode == 'Context Token Required') {
		$('#access-code-container').show();
	}
	$('#welcome-message').text(decisionTree.welcomeMessage);
	if (msg) {
		lvl = lvl || 'info';
		$('#message').removeClass('alert-info').removeClass('alert-danger').removeClass('alert-warning').removeClass('alert-success').addClass('alert-'+lvl).text(msg);
		$('#message-container').show();
	}

}

function updateUI(cfg) {
	cfg = cfg || {};
	var msg = cfg.message, 
		lvl = cfg.level,
		started = cfg.started == true,
		completed = cfg.completed == true,
		finished = cfg.finished == true;
	// initially hide everything
	$('.decision-item').hide();
	clearQuestionTimer();
	paintHeader(msg, lvl);
	if (currentQuestion) {
		paintCurrentQuestion(cfg.previousQuestion, started);
		paintDecisionTimer();
	}
	else if (finished) {
		paintFinished(cfg.finalQuestion);
		paintDecisionTimer();
	}
	else if (completed) {
		paintCompleted();
	}
	else { //start
		paintStart();
	}
}

function clearQuestionTimer() {
	var interval = $('#question-timer').data('interval');
	if (interval) window.clearInterval(interval);
}

function nextQuestion(lastCode, matchType, noAnswer) {
	var q = null;
		finished = false,
		prevQuestion = currentQuestion,
		r = findResponseByQuestion(prevQuestion);
	// look for destination
	//console.log(getDestinationInfo(r));
	if (!getDestinationInfo(r)) {
		if (lastCode) {
			for (var k2 in decisionTree.links) { //look for link to
				var l = decisionTree.links[k2];
				if ((l.fromQuestion == lastCode && matchType == 'question' && l.fromConnector == 'output_1') || 
					(l.fromConnector == lastCode && matchType == 'answer')) {
					q = decisionTree.questions[l.toQuestion];
					break;
				}
			}
			if (!q && matchType == 'question' && noAnswer) {
				var matchToConnection = null,
					allMatched = true;
				for (k3 in prevQuestion.answers) {
					var a = prevQuestion.answers[k3];
					for (var k4 in decisionTree.links) {
						var l = decisionTree.links[k4];
						if (l.fromConnector == a.code) {
							matchToConnection = matchToConnection || l.toQuestion;
							if (l.toQuestion != matchToConnection) {
								allMatched = false;
								break;
							}
						}
					}
					if (!allMatched) break;
				}
				if (allMatched && matchToConnection) q = decisionTree.questions[matchToConnection];
			}
		}
		else {
			for (var k in decisionTree.questions) { //loop through all
				q = decisionTree.questions[k];
				var isFirst = isFirstQuestion(q);			
				if (isFirst) break; //no link found, must be start
			}
		}		
	}
	currentQuestion = q;
	//console.log(currentQuestion);
	$(document).trigger('player.change',[currentQuestion ? 'question.changed' : 'finish',currentQuestion||prevQuestion, prevQuestion]);
	return currentQuestion;
}