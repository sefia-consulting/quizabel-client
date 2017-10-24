var data = {
		questions: {}
	},
	newDecisionTree = true;

var QUESTION_ATTS = {
	'designer.validation':'question.validation',
	'designer.min':'question.min',
	'designer.max':'question.max',
	'designer.maxAnswers':'question.maxAnswers',
	'designer.symbol':'question.symbol',
	'designer.symbolEmpty':'question.symbolEmpty',
	'designer.defaultValue':'question.defaultValue',
	'designer.leftLabel':'question.leftLabel',
	'designer.centerLabel':'question.centerLabel',
	'designer.rightLabel':'question.rightLabel'
};	

function makeId() {
	var text = "";
	var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

	for (var i = 0; i < 9; i++)
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	return text;
}

function handleChange(changeType) {
	$('#save-decision-tree').text('Commit*');
	$('#revert-decision-tree').prop("disabled",false);
	if (typeof(Storage) !== "undefined") {
		var treeJSON = JSON.stringify(getUpdatedData());
		localStorage.setItem("decisionTree:"+(newDecisionTree?'new':$('[name="decisionTree.id"]').val()), treeJSON);
	}
}

function addAnswer(val, highlight) {
	if (val) {
		var key = val.code || makeId(),
			label = val.label || '';
		label = label.trim() || '(no text)';
		var answerDiv = $('#answers');	
		answerDiv.append('<div class="answer-div '+(val.correct?'answer-correct':'')+'" data-connector_id="'+key+'"><span class="answer-span" contenteditable="true" >'+label+'</span><div class="close delete-answer" aria-label="Close"><span aria-hidden="true" contenteditable="false">&times;</span></div><span class="correct-checkbox-span" title="Correct"><input type="checkbox" class="answer-correct-checkbox" data-connector_id="'+key+'" style="cursor:pointer" '+(val.correct?'checked':'')+'/>&nbsp;&nbsp;</span></div>');
		$('input[name="new-answer"]').val(null);
		answerDiv.scrollTop(answerDiv.prop("scrollHeight"));
		if (highlight) $('[data-connector_id="'+key+'"]').animate( { backgroundColor: "#FFFFE0" }, 750 ).animate( { backgroundColor: "#FAFAFA" }, 750 );

	}	
}

function addAttributeValue(k, val, jqAtts, highlight) {
	if (k) {
		jqAtts.append('<div class="attribute-div row" data-att-name="'+k+'"><div class="attribute-name-span col-xs-5" contenteditable="true">'+k+'</div><div class="attribute-value-span col-xs-6" contenteditable="true">'+val+'</div><div class="col-xs-1 text-right" aria-label="Close"><span aria-hidden="true" contenteditable="false" class="delete-attribute">&times;</span></div></span></div>');
		jqAtts.scrollTop(jqAtts.prop("scrollHeight"));
		if (highlight) jqAtts.find('[data-att-name="'+k+'"]').animate( { backgroundColor: "#FFFFE0" }, 750 ).animate( { backgroundColor: "#FAFAFA" }, 750 );

	}
}

function addAttribute(buttonElem) {
	buttonElem = buttonElem || event.target;
	var jqBtn = $(buttonElem),
		jqInput = $(jqBtn.attr('data-attribute-value')),
		jqKey = $(jqBtn.attr('data-attribute-name')),
		jqAtts = $(jqBtn.attr('data-attributes-container')),
		val = jqInput.val(),
		k = jqKey.val();
	addAttributeValue(k, val, jqAtts, true)
	jqInput.val(null);
	jqKey.val(null);
}

function onCreateQuestion() {
	$('#question-modal .modal-title').text('New Question');
	$('input[name="question-id"]').val(null);
	$('input[name="displayText"]').val(null);
	$('#question-delete').hide();
	$('#question-modal').modal('show');
	$('select[name="questionType"]').val('singleMultipleChoice');
	$('#answers').empty();
	$('input[name="new-answer"]').val(null);
	$('input[name="destinationURI"]').val(null);
	$('input[name="moreInfoURI"]').val(null);
	$('input[name="imageURI"]').val(null);
	$('input[name="points"]').val(null);
	$('input[name="question.timeLimit"]').val(null);
	$('input[name="question.finishMessage"]').val(null);
	$('input[name="question.welcomeMessage"]').val(null);
	$('input[name="answerRequired"]').prop('checked', true);
	$('input[name="allowBack"]').prop('checked', true);
	$('#advanced-question-details').collapse("hide");
	$('.type-specific-group').hide();
	$('.singleMultipleChoice-group').show();
	for (var ak in QUESTION_ATTS) {
		$('[name="'+QUESTION_ATTS[ak]+'"]').val(null);
	}


	$('#answers-container').show();		
	$('input[name="displayText"]').focus();	
}

function onDeleteKey() {
	if ((event.keyCode == 8 || event.keyCode == 46)
	 	&& !$('#question-modal').hasClass('in')
	 	&& !$('#answer-modal').hasClass('in')
		&& ($('#decision-tree-canvas').designer('getSelectedQuestionId') || $('#decision-tree-canvas').designer('getSelectedLinkId')))  {
		var flowId = $('#decision-tree-canvas').designer('getSelectedQuestionId');
		if (flowId) {
			$('#decision-tree-canvas').designer('deleteQuestion', flowId);
		}
		else {
			flowId = $('#decision-tree-canvas').designer('getSelectedLinkId');
			$('#decision-tree-canvas').designer('deleteLink', flowId);
		}
	}	
}

function onTokenModeChange(elem) {
	var jqThis = $(elem || this);	
	if (jqThis.val().indexOf('Context') >= 0) {
		$('[name="showContext"]').removeAttr('disabled');
		$('[name="contextTokenValidation"]').removeAttr('disabled');
		$('[name="contextTokenOneTime"]').removeAttr('disabled');
	}
	else {
		$('[name="showContext"]').attr('disabled', true);
		$('[name="contextTokenValidation"]').attr('disabled', true);
		$('[name="contextTokenOneTime"]').attr('disabled', true);
	}
}

function revert() {
	if (typeof(Storage) !== "undefined") {
		localStorage.removeItem("decisionTree:"+(newDecisionTree?'new':$('[name="decisionTree.id"]').val()));
	}
	document.location.href = '/resources/admin/decisionTree/designer'+(newDecisionTree?'':'/'+$('[name="decisionTree.id"]').val());
}

function showQuestionModal(questionId) {
	var questionData = $('#decision-tree-canvas').designer('getQuestionData', questionId);
	$('#decision-tree-canvas').designer('unsetTemporaryLink');
	$('#question-modal .modal-title').text('Edit Question');
	$('input[name="displayText"]').val(questionData.displayText);
	$('input[name="destinationURI"]').val(questionData.destinationURI);
	$('input[name="moreInfoURI"]').val(questionData.moreInfoURI);
	$('input[name="imageURI"]').val(questionData.imageURI);
	$('input[name="points"]').val(questionData.points);
	$('input[name="question.timeLimit"]').val(questionData.timeLimit);
	$('[name="question.finishMessage"]').val(questionData.finishMessage);
	$('[name="question.welcomeMessage"]').val(questionData.welcomeMessage);
	$('input[name="answerRequired"]').prop('checked', questionData.answerRequired == true)
	$('input[name="allowBack"]').prop('checked', questionData.allowBack == true)
	$('input[name="question-id"]').val(questionId);
	$('select[name="questionType"]').val(questionData.questionType);
	$('#answers').empty();
	if (questionData.questionType == 'singleMultipleChoice' ||
		questionData.questionType == 'multipleMultipleChoice') {
		for (var key in questionData.answers) {
			var val = questionData.answers[key];
			if (questionData.questionType == 'singleMultipleChoice')
				addAnswer(val);
			else
				$.each(val.labels, function(idx, it) {
					addAnswer(it);
				});
		}
	}
	for (var ak in QUESTION_ATTS) {
		$('[name="'+QUESTION_ATTS[ak]+'"]').val(questionData.attributes[ak]).trigger('change');
	}

	var atts = $('#question-attributes');
	atts.empty()
	for (var ak in questionData.attributes) {
		if (ak.indexOf('designer.') != 0) {
			addAttributeValue(ak, questionData.attributes[ak], atts);			
		}
	}
	$('#question-delete').show();	
	$('input[name="new-answer"]').val(null);
	$('#question-modal').modal('show');
	$('.type-specific-group').hide();
	$('.'+questionData.questionType+'-group').show();

	$('input[name="displayText"]').focus();	
}

function saveModalQuestion() {
	var questionCounter = Object.keys(data.questions).length + 1;
	var questionText = $('input[name="displayText"]').val() || ('Question '+questionCounter);
	var questionId = $('input[name="question-id"]').val(),
		questionType = $('select[name="questionType"]').val(),
		newQuestion = (questionId == undefined || questionId == null || questionId == ''),
		questionData;
	if (newQuestion) {
		questionId = makeId();
		questionData = {
			top: 100,
			left: 400,
			properties: {}
		};
		questionData.inputs = { input_1: { label: '_X_', class:'transparent' } }
	}
	else {
		questionData = $('#decision-tree-canvas').designer('getQuestionData', questionId);
	}
	questionData.displayText = questionText;
	questionData.questionType = questionType;
	questionData.questionTypeDisplay = $('select[name="questionType"]>option:selected').text();
	questionData.class = 'question-type-'+questionType;
	var answers = {};
	if (questionType == 'singleMultipleChoice') {
		$('#answers>div').each(function(idx, itm) {
			var code = $(itm).data('connector_id') || makeId();
			var correct = $('input[data-connector_id="'+code+'"]').prop('checked');
			var l = $(itm).children('span').text().trim();

			if (l) {
				var ansCfg = questionData.answers[code] || {code: code, class:'single-answer'};
				ansCfg.label = l != '(no text)' ? l : '';
				ansCfg.correct = correct;
				answers[code] = ansCfg;
			}
		});
	}
	else if (questionType == 'multipleMultipleChoice') {
		answers['output_1'] = {labels:[], class:'multiple-answer'};
		$('#answers>div').each(function(idx, itm) {
			var code = $(itm).data('connector_id') || makeId();
			var correct = $('input[data-connector_id="'+code+'"]').prop('checked');
			var l = $(itm).children('span').text().trim();
			if (l) {
				var ansCfg = {code: code, class:'multiple-answer'};
				$.each(questionData.answers['output_1'].labels, function(idx, itm) {
					if (itm.code == code) ansCfg = itm;
				});
				ansCfg.label = l != '(no text)' ? l : '';
				ansCfg.correct = correct;
				answers['output_1'].labels.push(ansCfg);
			}	
		});
	}
	else if (questionType == 'shortAnswer') {
		answers['output_1'] = {label:'User provided answer', class:'short-answer'};
	}
	else if (questionType == 'scale') {
		answers['output_1'] = {label:'Scale value', class:'scale'};
	}
	questionData.answers = answers;
	var fields = {
		'destinationURI':'destinationURI',
		'destinationText':'destinationText',
		'moreInfoURI':'moreInfoURI',
		'imageURI':'imageURI',
		'finishMessage':'question.finishMessage'
	}
	for (var field in fields) {
		questionData[field] = $('[name="'+fields[field]+'"]').val();
	};
	questionData.points = parseInt($('input[name="points"]').val());
	questionData.timeLimit = parseInt($('input[name="question.timeLimit"]').val());
	questionData.answerRequired = $('input[name="answerRequired"]').prop('checked');
	questionData.allowBack = $('input[name="allowBack"]').prop('checked');
	questionData.attributes = {};
	$('#question-attributes>div').each(function(idx, itm) {
		var k = $(itm).find('.attribute-name-span').text().trim();
		var v = $(itm).find('.attribute-value-span').text().trim();
		questionData.attributes[k] = v;
	});
	for (var ak in QUESTION_ATTS) {
		questionData.attributes[ak] = $('[name="'+QUESTION_ATTS[ak]+'"]').val();
	}

	if (newQuestion) {
		$('#decision-tree-canvas').designer('createQuestion', questionId, questionData);
	} 
	else {
		$('#decision-tree-canvas').designer('setQuestionData', questionId, questionData);
	}
	$('#decision-tree-canvas').designer('selectQuestion', questionId);
    $("#"+questionId).animate( { backgroundColor: "#FFFFE0" }, 750 ).animate( { backgroundColor: "#FAFAFA" }, 750 );
}

function showAnswerModal(answerElem) {
	$('#decision-tree-canvas').designer('unsetTemporaryLink');
	var jqThis = $(answerElem || this),
		questionId = jqThis.parents('.designer-question').attr('id'),
		questionData = $('#decision-tree-canvas').designer('getQuestionData', questionId),
		code = jqThis.attr('data-code'),
		answerData;
	for (var key in questionData.answers) {
		if (!answerData && key == code) {
			answerData = questionData.answers[key];
		}
		if (!answerData) {
			$.each(questionData.answers[key].labels, function(idx, itm) {
				if (!answerData && itm.code == code) answerData = itm;
			});
		}
	}
	//console.log(answerData);
	if (!answerData) return;
	$('#answer-modal .modal-title').text('Edit Answer');
	$('[name="answer.code"]').val(answerData.code);
	$('[name="answer.question.code"]').val(questionId);
	$('[name="answer.value"]').val(answerData.value);
	$('[name="answer.displayText"]').val(answerData.label);
	$('[name="answer.displayIndex"]').val(answerData.displayIndex);
	$('[name="answer.correct"').prop('checked', answerData.correct == true);
	$('[name="answer.finishMessage"]').val(answerData.finishMessage);
	$('[name="answer.moreInfoURI"]').val(answerData.moreInfoURI);
	$('[name="answer.imageURI"]').val(answerData.imageURI);
	$('[name="answer.destinationURI"]').val(answerData.destinationURI);
	var atts = $('#answer-attributes');
	atts.empty()
	for (var ak in answerData.attributes) {
		if (ak.indexOf('designer.') != 0) {
			addAttributeValue(ak, answerData.attributes[ak], atts);			
		}
	}
	$('#answer-modal').modal('show');
	// do attributes
}
function removeModalAnswer() {
	var questionCode = $('[name="answer.question.code"]').val(),
		answerCode = $('[name="answer.code"]').val(),
		questionData = $('#decision-tree-canvas').designer('getQuestionData', questionCode);
	for (var key in questionData.answers) {
		console.log('comparing '+key+' to '+answerCode);
		if (key == answerCode) {
			delete questionData.answers[key];
			break;
		}
		if (questionData.answers[key].labels) {
			var found = false;
			for (var i = 0; i < questionData.answers[key].labels.length; i++) {
				console.log('comparing '+questionData.answers[key].labels[i].code+' to '+answerCode);
				if (questionData.answers[key].labels[i].code == answerCode) {
					console.log('-> MATCH');
					questionData.answers[key].labels.splice(i, 1);
					console.log(questionData.answers[key].labels);
					found = true;
				}
				if (found) break;
			}
			if (found) break;			
		}
	}
	$('#decision-tree-canvas').designer('setQuestionData', questionCode, questionData);
	$('#decision-tree-canvas').designer('selectQuestion', questionCode);
}

function saveModalAnswer() {
	var answerText = $('[name="answer.displayText"]').val();
	var questionCode = $('[name="answer.question.code"]').val(),
		answerCode = $('[name="answer.code"]').val(),
		questionData = $('#decision-tree-canvas').designer('getQuestionData', questionCode),
		answerData;
	for (var key in questionData.answers) {
		if (!answerData && key == answerCode) {
			answerData = questionData.answers[key];
		}
		if (!answerData) {
			$.each(questionData.answers[key].labels, function(idx, itm) {
				if (!answerData && itm.code == answerCode) answerData = itm;
			});
		}
	}
	answerData.label = answerText;
	answerData.correct = $('[name="answer.correct"]').prop('checked');
	answerData.destinationURI = $('[name="answer.destinationURI"]').val();
	answerData.moreInfoURI = $('[name="answer.moreInfoURI"]').val();
	answerData.imageURI = $('[name="answer.imageURI"]').val();
	answerData.finishMessage = $('[name="answer.finishMessage"]').val();
	answerData.displayIndex = $('[name="answer.displayIndex"]').val() ? parseInt($('[name="answer.displayIndex"]').val()) : 0;
	answerData.attributes = {};
	$('#answer-attributes>div').each(function(idx, itm) {
		var k = $(itm).find('.attribute-name-span').text().trim();
		var v = $(itm).find('.attribute-value-span').text().trim();
		answerData.attributes[k] = v;
	});
	$('#decision-tree-canvas').designer('setQuestionData', questionCode, questionData);
	$('#decision-tree-canvas').designer('selectQuestion', questionCode);
}

function handleCorrectCheckbox(elem) {
	var jqThis = $(elem || this);
	var connector_id = jqThis.data('connector_id');
	if (jqThis.prop('checked')) {
		$('div[data-connector_id="'+connector_id+'"]').addClass('answer-correct');
	}
	else {
		$('div[data-connector_id="'+connector_id+'"]').removeClass('answer-correct');
	}
}

function getUpdatedData() {
	var treeData = $('#decision-tree-canvas').designer('getData');
	treeData.dbId = $('input[name="decisionTree.id"]').val();
	if ($('input[name="decisionTree.version"]').val()) treeData.version = parseInt($('input[name="decisionTree.version"]').val());
	treeData.newDecisionTree = newDecisionTree;
	treeData.code = $('input[name="decisionTree.code"]').val();
	treeData.name = $('#decision-tree-name').text();
	treeData.contextTokenMode = $('select[name="contextTokenMode"]').val();
	treeData.contextTokenOneTime =  $('[name="contextTokenOneTime"]').prop( "checked" );
	treeData.contextTokenValidation = $('[name="contextTokenValidation"]').val();
	treeData.showContext = $('[name="showContext"]').prop( "checked" )  && treeData.contextTokenMode != 'None';
	treeData.requireLogin = $('[name="requireLogin"]').prop( "checked" );
	treeData.allowRestart = $('[name="allowRestart"]').prop( "checked" );
	treeData.saveUncommitted = $('[name="saveUncommitted"]').prop( "checked" );
	treeData.showName = $('[name="showName"]').prop( "checked" );
//		alert($('[name="showPoints"]').prop( "checked" ));
	treeData.showPoints = $('[name="showPoints"]').prop( "checked" );
//	alert($('[name="showPoints"]').prop( "checked" ));
	treeData.showCorrect = $('[name="showCorrect"]').prop( "checked" );
	treeData.showRecap = $('[name="showRecap"]').prop( "checked" );
	treeData.showTotals = $('[name="showTotals"]').prop( "checked" );
	treeData.theme = $('select[name="theme"]').val();

	if ($('input[name="finishRedirectUri"]').val()) 
		treeData.finishRedirectUri = $('input[name="finishRedirectUri"]').val();
	else 
		treeData.finishRedirectUri = null;
	if ($('input[name="imageUri"]').val()) 
		treeData.imageUri = $('input[name="imageUri"]').val();
	else 
		treeData.imageUri = null;
	if ($('input[name="finishImageUri"]').val()) 
		treeData.finishImageUri = $('input[name="finishImageUri"]').val();
	else 
		treeData.finishImageUri = null;
	if ($('[name="finishMessage"]').val()) 
		treeData.finishMessage = $('[name="finishMessage"]').val();
	else
		treeData.finishMessage = null;

	if ($('[name="timeLimit"]').val()) 
		treeData.timeLimit = parseInt($('[name="timeLimit"]').val());
	else
		treeData.timeLimit = null;

	if ($('[name="welcomeMessage"]').val()) 
		treeData.welcomeMessage = $('[name="welcomeMessage"]').val();
	else
		treeData.welcomeMessage = null;
	if ($('#description').val()) 
		treeData.description = $('#description').val();
	else
		treeData.description = null;

	return treeData;
}

function updateDecisionTreeForm() {
	if (data.dbId) $('input[name="decisionTree.id"]').val(data.dbId);
	if (data.code) $('input[name="decisionTree.code"]').val(data.code);
	if (data.version) $('input[name="decisionTree.version"]').val(data.version);
	else $('input[name="decisionTree.version"]').val(null);
	if (data.name) $('#decision-tree-name').text(data.name);
	else $('#decision-tree-name').text('My Decision Tree');
	$('#decision-tree-name').removeClass('loading');
	if (data.contextTokenMode) $('select[name="contextTokenMode"]').val(data.contextTokenMode);
	else  $('select[name="contextTokenMode"]').val('None');

	if (data.contextTokenValidation) $('[name="contextTokenValidation"]').val(data.contextTokenValidation);
	else  $('[name="contextTokenValidation"]').val(null);

	if (data.contextTokenOneTime == 'on' || data.contextTokenOneTime == true) $('[name="contextTokenOneTime"]').prop( "checked", true );
	else $('[name="contextTokenOneTime"]').prop( "contextTokenOneTime", false );

	if ((data.showContext == true || data.showContext == null || data.showContext == undefined) && data.contextTokenMode != 'None') $('[name="showContext"]').prop( "checked", data.showContext == true );
	else $('[name="showContext"]').prop( "checked", false);
	if (data.requireLogin) $('[name="requireLogin"]').prop( "checked", true );
	else $('[name="requireLogin"]').prop( "checked", false );
	if (data.allowRestart) $('[name="allowRestart"]').prop( "checked", true );
	else $('[name="allowRestart"]').prop( "checked", false );
	if (data.saveUncommitted) $('[name="saveUncommitted"]').prop( "checked", true );
	else $('[name="saveUncommitted"]').prop( "checked", false );
	if (data.showPoints) $('[name="showPoints"]').prop( "checked", true );
	else $('[name="showPoints"]').prop( "checked", false );
	if (data.showRecap) $('[name="showRecap"]').prop( "checked", true );
	else $('[name="showRecap"]').prop( "checked", false );
	if (data.showTotals) $('[name="showTotals"]').prop( "checked", true );
	else $('[name="showTotals"]').prop( "checked", false );
	if (data.showCorrect) $('[name="showCorrect"]').prop( "checked", true );
	else $('[name="showCorrect"]').prop( "checked", false );
	if (data.theme) $('select[name="theme"').val(data.theme);

	if (data.showName == true || data.showName == null || data.showName == undefined) {
		$('[name="showName"]').prop( "checked", true );
	}
	if (data.finishRedirectUri) 
		$('input[name="finishRedirectUri"]').val(data.finishRedirectUri);
	else 
		$('input[name="finishRedirectUri"]').val(null);
	if (data.imageUri) 
		$('input[name="imageUri"]').val(data.imageUri);
	else 
		$('input[name="imageUri"]').val(null);
	if (data.finishImageUri) 
		$('input[name="finishImageUri"]').val(data.finishImageUri);
	else 
		$('input[name="finishImageUri"]').val(null);

	if (data.finishMessage) 
		$('[name="finishMessage"]').val(data.finishMessage);
	else
		$('[name="finishMessage"]').val(null);

	$('[name="timeLimit"]').val(data.timeLimit);

	if (data.welcomeMessage) 
		$('[name="welcomeMessage"]').val(data.welcomeMessage);
	else
		$('[name="welcomeMessage"]').val(null);
	if (data.description) 
		$('[name="description"]').val(data.description);
	else
		$('[name="description"]').val(null);

	if (!data.contextTokenMode || data.contextTokenMode == 'None') {
		$('[name="showContext"]').attr('disabled', true);
		$('[name="contextTokenOneTime"]').attr('disabled', true);
		$('[name="contextTokenValidation"]').attr('disabled', true);
	}
	if (data.dbId) {
		$('#edit-decision-tree').attr('href', '/resources/admin/decisionTree/edit/'+data.dbId);
		$('#results-decision-tree').attr('href', '/resources/admin/decisionTree/responseReport/'+data.dbId);
		$('#back-decision-tree').attr('href', '/resources/admin/decisionTree/show/'+data.dbId);
		$('#take-decision-tree').attr('href', '/resources/decisions/show/'+data.code);	
		$('.new-feature').hide();
		$('.edit-feature').show();
	} else {
		$('.new-feature').show();
		$('.edit-feature').hide();
	}
}

function saveDecisionTree(callback) {
	var treeData = getUpdatedData();
	console.log(treeData);
	var treeJSON = JSON.stringify(treeData);
	try {
		$.ajax({
			type: "POST",
			url: "/resources/admin/decisionTree/saveDesign"+(treeData.dbId?'/'+treeData.dbId:''),
			data: treeJSON,
			contentType: "application/json; charset=utf-8",
			dataType: "json",
			success: function(data){
				console.log(data);
				if (data.dbId) $('input[name="decisionTree.id"]').val(data.dbId);
				if (data.code) $('input[name="decisionTree.code"]').val(data.code);
				$.notify({
					message: (data.message || 'Changes committed.')
				},{
					placement: {
						from: "top",
						align: "center"
					},
					delay:3000,
					type: (data.level || 'info')
				});
				$('#save-decision-tree').text('Commit');
				$('#take-decision-tree').parent('a').attr('href','/resources/survey/'+data.code)
				$('#take-decision-tree').show();
				$('#revert-decision-tree').parent('a').attr('href','/resources/admin/decisionTree/designer/'+data.dbId)
				$('#revert-decision-tree').show();
				$('#edit-decision-tree').parent('a').attr('href','/resources/admin/decisionTree/show/'+data.dbId)
				$('#edit-decision-tree').show();
				$('#results-decision-tree').parent('a').attr('href','/resources/admin/decisionTree/responseReport/'+data.dbId)
				$('#results-decision-tree').show();
				$('#revert-decision-tree').prop("disabled",true);
				if (typeof(Storage) !== "undefined") {
					localStorage.removeItem("decisionTree:"+(newDecisionTree?'new':$('[name="decisionTree.id"]').val()));
				}
				newDecisionTree = false;
				//updateDecisionTreeForm();
				if (callback) callback();
			},
			error: function(jqXHR, textStatus, errMsg) {
				$.notify({
					message: 'Changes could not be saved. Click to try reloading. ',
					url: document.location.href
				},{
					placement: {
						from: "top",
						align: "center"
					},
					delay:3000,
					type: 'danger'
				});
				//if (callback) callback();
			}
		});
	}
	catch (e) {
		if (confirm("There was a problem saving. Click ok to try reloading the designer.")) {
			document.location.reload();
		}
	}

}

function checkForUncommittedData(code) {
	var rtn = false;
	if (typeof(Storage) !== "undefined") {
		if (localStorage.getItem("decisionTree:hide-details") == "false") {
			$('#decision-tree-details').collapse("show");
		}
		var key = "decisionTree:"+code;
		var treeJSON = localStorage.getItem(key);
		if (treeJSON) {
			var storedData = JSON.parse(treeJSON);
			var message = code == 'new' ? 'We found an unsaved new decision tree. Would you like to load it?':'We found an unsaved design of this decision tree. Would you like to load it?';
			if (storedData.version != data.version) {
				message += '\n\nWARNING:\nPlease note that the versions do not match.\nLoading the unsaved version may lead to a LOSS OF DATA!'
			}
			if (confirm(message)) {
				data = storedData;
				rtn = true;
			} // could discard
			else {
				localStorage.removeItem(key);
			}
		}
	}
	return rtn;
}

function loadDecisionTree() {
	var paths = location.pathname.split('/'),
		i = paths.length -1,
		id;
	newDecisionTree = true;
	while (!id && i >= 0) {
		id = paths[i];
		if (id) {
			if ($.isNumeric(id) || id != 'designer') {
				newDecisionTree = false;
				break;
			}
			else if (id == 'designer') {
				break;
			}
		}
		i--;
	}
	if (newDecisionTree) {
		checkForUncommittedData('new');
		$('#decision-tree-canvas').designer({data:data, onAfterChange:handleChange});
		updateDecisionTreeForm();
	}
	else {
		if (!checkForUncommittedData(id)) {
			$.ajax({
				type: "GET",
				url: "/resources/admin/decisionTree/designerData/"+id,
				dataType: "json",
				success: function(returnData){
					console.log(returnData);
					data = returnData;
					newDecisionTree = false;
					updateDecisionTreeForm();
					$('#decision-tree-canvas').designer({data:data, onAfterChange:handleChange});
					$('#revert-decision-tree').prop("disabled",true);
				},
				errors: function(jxrq, status, errMsg) {
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
		else {
			updateDecisionTreeForm();
			$('#decision-tree-canvas').designer({data:data, onAfterChange:handleChange});
			$('#save-decision-tree').text('Commit*');
			$('#revert-decision-tree').prop("disabled",false);

		}

	}
}

$(document).ready(function() {
	loadDecisionTree();
	////////////////	
	// handler stuff
	////////////////	
	$('#revert-decision-tree').click(function() {
		revert();
	});
	$('#question-delete').click(function() {
		var questionId = $('input[name="question-id"]').val();
		$('#decision-tree-canvas').designer('deleteQuestion', questionId);
		$('#question-modal').modal('hide');
	});
	$('#add-answer-btn').click(function() {
		var val = $('input[name="new-answer"]').val();
		addAnswer({'label':val, 'correct':false}, true);
	});
	$('#create-question').click(onCreateQuestion);
	$('select[name="questionType"]').change(function() {
		$('.type-specific-group').hide();
		$('.'+$(this).val()+'-group').show();
	});
	$('#decision-tree-name, #decision-tree-form input, #decision-tree-form select, #decision-tree-form textarea').on('change keyup input', function() {
		handleChange('decisionTreeEdit');
		return false;
	});
	$('#decision-tree-details').on('hidden.bs.collapse', function () {
		$('#decision-tree-details-toggle').text('Show Details');
		if (typeof(Storage) !== "undefined") {
			localStorage.setItem("decisionTree:hide-details", "true");
		}
	});
	$('#decision-tree-details').on('shown.bs.collapse', function () {
		$('#decision-tree-details-toggle').text('Hide Details');
		if (typeof(Storage) !== "undefined") {
			localStorage.setItem("decisionTree:hide-details", "false");
		}
	});
	$('[name="question.symbolEmpty"],[name="question.symbol"]').on('change',function() {
		var jqThis = $(this);
			icon = $(jqThis.data('icon'));
		icon.attr('class', null);
		icon.addClass(jqThis.val());
	});
	$(document).on('keyup', onDeleteKey);
	$(document).on('dblclick', '.designer-link', function() {
		$('#decision-tree-canvas').designer('deleteLink', $(this).data('link_id'));

	});
	$(document).on('click', '.delete-answer', function() {
		$(this).parent('div').remove();
	});
	$(document).on('click', '.delete-attribute', function() {
		$(this).parent('div').parent('div').remove();
	});
	$('select[name="contextTokenMode"]').change(function() {
		onTokenModeChange(this);
	});
	$(document).on('dblclick dbltap', '.designer-question', function() {
		showQuestionModal($(this).attr('id'));
		return false;
	});
	$(document).on('dblclick','.designer-question-answers .designer-question-connector-label, .designer-question-answers .designer-question-connector-sublabel', function() {
		showAnswerModal(this);
		return false;	
	});
	$(document).on('change','input.answer-correct-checkbox', function() {
		handleCorrectCheckbox(this);
	});
	$('#question-save').click(function() {
		saveModalQuestion();
		$('#question-modal').modal('hide');
	});
	$('#save-decision-tree').click(function() {
		var jq =$(this);
		jq.prop('disabled', true);
		saveDecisionTree(function() {
			jq.prop('disabled', false);
		});;
	});
	$('.add-attribute-btn').on('click', function() {addAttribute(this);});
	$('#answer-save').click(function() {
		saveModalAnswer();
		$('#answer-modal').modal('hide');
	});
	$('#answer-delete').click(function() {
		removeModalAnswer();
		$('#answer-modal').modal('hide');
	});
	$('[name="new-answer"]').on('keypress', function() {
		if (event.keyCode == 13) {
			addAnswer({label:$(this).val(), correct:false}, true);
		}
	});
	$('.image-label').on('click', function() {
		var href = $('[name="'+$(this).attr('for')+'"]').val();
		if (href) $.featherlight(href);
	});
	$('.link-label').on('click', function() {
		var href = $('[name="'+$(this).attr('for')+'"]').val();
		if (href) window.open(href);
	});
	if (newDecisionTree) {
		$('#question-modal').modal('show');
		$('.new-feature').show();
		$('.edit-feature').hide();
	}
	else {
		$('.new-feature').hide();
		$('.edit-feature').show();
	}
});
