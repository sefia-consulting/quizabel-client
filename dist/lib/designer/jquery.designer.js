$(function() {
// the widget definition, where "custom" is the namespace,
// "colorize" the widget name
	$.widget( "designer.designer", {
		// default options
		options: {
			canUserEditLinks: true,
			canUserMoveQuestions: true,
			data: {},
			distanceFromArrow: 0,
			defaultQuestionClass: 'question-class',
			defaultLinkColor: '#337ab7',
			defaultSelectedLinkColor: '#eea236',
			linkWidth: 2.5,
			grid: 20,
			multipleLinksOnOutput: false,
			multipleLinksOnInput: true,
			onQuestionSelect: function(questionId) {
				return true;
			},
			onQuestionUnselect: function() {
				return true;
			},
			onLinkSelect: function(linkId) {
				return true;
			},
			onLinkUnselect: function() {
				return true;
			},
			onQuestionCreate: function(questionId, questionData, fullElement) {
				return true;
			},
			onLinkCreate: function(linkId, linkData) {
				return true;
			},
			onQuestionDelete: function(questionId) {
				return true;
			},
			onLinkDelete: function(linkId, forced) {
				return true;
			},
			onAfterChange: function(changeType) {
				return;
			}
		},
		data: null,
		objs: null,
		maskNum: 0,
		linkNum: 0,
		lastOutputConnectorClicked: null,
		selectedQuestionId: null,
		selectedLinkId: null,
		positionRatio: 1,	   
		suppressAfterChangeEvent: false,
		// the constructor
		_create: function() {
			this._unitVariables();  
		  
			this.element.addClass('designer-container');
			
			this.objs.layers.links = $('<svg class="designer-links-layer"></svg>');
			this.objs.layers.links.appendTo(this.element);
			
			this.objs.layers.questions = $('<div class="designer-questions-layer unselectable"></div>');
			this.objs.layers.questions.appendTo(this.element);
			
			this.objs.layers.temporaryLink = $('<svg class="designer-temporary-link-layer"></svg>');
			this.objs.layers.temporaryLink.appendTo(this.element);
			
			var shape = document.createElementNS("http://www.w3.org/2000/svg", "line");
			shape.setAttribute("x1", "0");
			shape.setAttribute("y1", "0");
			shape.setAttribute("x2", "0");
			shape.setAttribute("y2", "0");
			shape.setAttribute("stroke-dasharray", "6,6");
			shape.setAttribute("stroke-width", "4");
			shape.setAttribute("stroke", "black");
			shape.setAttribute("fill", "none");
			this.objs.layers.temporaryLink[0].appendChild(shape);
			this.objs.temporaryLink = shape;
			
			this._initEvents();
			
			if (typeof this.options.data != 'undefined') {
				this.setData(this.options.data);
			}
		},
	  
		_unitVariables: function() {
			this.data = {
				questions: {},
				links: {},
			};
			this.objs = {
				layers: {
					questions: null,
					temporaryLink: null,
					links: null
				},
				linksContext: null,
				temporaryLink: null
			};
		},
		
		_initEvents: function() {
			var self = this;
			
			this.element.mousemove(function(e) {
				var $this = $(this);
				var offset = $this.offset();
				self._mousemove((e.pageX - offset.left) / self.positionRatio, (e.pageY - offset.top) / self.positionRatio, e);
			});
			
			this.element.click(function(e) {
				var $this = $(this);
				var offset = $this.offset();
				self._click((e.pageX - offset.left) / self.positionRatio, (e.pageY - offset.top) / self.positionRatio, e);
			});
			
			this.objs.layers.questions.on('mousedown touchstart', '.designer-question', function(e) {
				e.stopImmediatePropagation();
			});
			
			this.objs.layers.questions.on('click', '.designer-question', function(e) {
				if ($(e.target).closest('.designer-question-connector').length == 0) {
					self.selectQuestion($(this).data('question_id'));
				}
			});
			
			this.objs.layers.questions.on('click', '.designer-question-connector', function() {
				var $this = $(this);
				if (self.options.canUserEditLinks) {
					self._connectorClicked($this.closest('.designer-question').data('question_id'), $this.data('connector'), $this.data('connector_type'));
				}
			});
			
			this.objs.layers.links.on('mousedown touchstart', '.designer-link', function(e) {
				e.stopImmediatePropagation();
			});
			
			this.objs.layers.links.on('mouseover', '.designer-link', function() {
				self._connecterMouseOver($(this).data('link_id'));
			});
			
			this.objs.layers.links.on('mouseout', '.designer-link', function() {
				self._connecterMouseOut($(this).data('link_id'));
			});
			
			this.objs.layers.links.on('click', '.designer-link', function() {
				self.selectLink($(this).data('link_id'));
			});
		},
		
		setData: function(data) {
			this.suppressAfterChangeEvent = true;
			this._clearQuestionsLayer();
			this.data.questions = {};
			for (var questionId in data.questions) {
				this.createQuestion(questionId, data.questions[questionId]);
			}
			for (var linkId in data.links) {
				this.createLink(linkId, data.links[linkId]);
			}
			this.redrawLinksLayer();
			this.suppressAfterChangeEvent = false;
		},
		
		addLink: function(linkData) {
			while(typeof this.data.links[this.linkNum] != 'undefined') {
				this.linkNum++;
			}
			this.createLink(this.linkNum, linkData);
			return this.linkNum;
		},
		
		createLink: function(linkId, linkDataOriginal) {
			var linkData = $.extend(true, {}, linkDataOriginal);
			if (!this.options.onLinkCreate(linkId, linkData)) {
				return;
			}			
			var multipleLinksOnOutput = this.options.multipleLinksOnOutput;
			var multipleLinksOnInput = this.options.multipleLinksOnInput;
			if (!multipleLinksOnOutput || !multipleLinksOnInput) {
				for (var linkId2 in this.data.links) {
					var currentLink = this.data.links[linkId2];
					if (!multipleLinksOnOutput && currentLink.fromQuestion == linkData.fromQuestion && currentLink.fromConnector == linkData.fromConnector) {
						this.deleteLink(linkId2);
						continue;
					}
					if (!multipleLinksOnInput && currentLink.toQuestion == linkData.toQuestion && currentLink.toConnector == linkData.toConnector) {
						this.deleteLink(linkId2);
						continue;
					}
				}
			}			
			this.data.links[linkId] = linkData;
			this._drawLink(linkId);
			if (this.suppressAfterChangeEvent != true) this.options.onAfterChange('createLink');

		},
		
		redrawLinksLayer: function() {
			this._clearLinksLayer();
			for (var linkId in this.data.links) {
				this._drawLink(linkId);
			}
		},
		
		_clearLinksLayer: function() {
			this.objs.layers.links.empty();
			this.objs.layers.questions.find('.designer-question-connector-small-arrow').css('border-left-color', 'transparent');
		},
		
		_clearQuestionsLayer: function() {
			this.objs.layers.questions.empty();
		},
		
		getConnectorPosition: function(questionId, connectorId) {
			var questionData = this.data.questions[questionId];
			var $connector = questionData.internal.els.connectorArrows[connectorId];
			
			var connectorOffset = $connector.offset();
			var elementOffset = this.element.offset();
			
			var x = (connectorOffset.left - elementOffset.left) / this.positionRatio;
			var width = parseInt($connector.css('border-top-width'));
			var y = (connectorOffset.top - elementOffset.top - 1) / this.positionRatio + parseInt($connector.css('border-left-width'));
		  
			return {x: x, width: width, y: y};
		},
		
		getLinkMainColor: function(linkId) {
			var color = this.options.defaultLinkColor;
			var linkData = this.data.links[linkId];
			if (typeof linkData.color != 'undefined') {
				color = linkData.color;
			}
			return color;
		},
		
		setLinkMainColor: function(linkId, color) {
			this.data.links[linkId].color = color;
		},
		
		_drawLink: function(linkId) {
			var linkData = this.data.links[linkId];
			
			if (typeof linkData.internal == 'undefined') {
				linkData.internal = {};
			}
			linkData.internal.els = {};
			
			var fromQuestionId = linkData.fromQuestion;
			var fromConnectorId = linkData.fromConnector;
			var toQuestionId = linkData.toQuestion;
			var toConnectorId = linkData.toConnector;
			
			var color = this.getLinkMainColor(linkId);
			
			var fromQuestion = this.data.questions[fromQuestionId];
			var toQuestion = this.data.questions[toQuestionId];
			
			var fromSmallConnector = fromQuestion.internal.els.connectorSmallArrows[fromConnectorId];
			var toSmallConnector = toQuestion.internal.els.connectorSmallArrows[toConnectorId];
			
			linkData.internal.els.fromSmallConnector = fromSmallConnector;
			linkData.internal.els.toSmallConnector = toSmallConnector;
			
			var overallGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
			this.objs.layers.links[0].appendChild(overallGroup);
			linkData.internal.els.overallGroup = overallGroup;
			
			var mask = document.createElementNS("http://www.w3.org/2000/svg", "mask");
			var maskId = "fc_mask_" + this.maskNum;
			this.maskNum++;
			mask.setAttribute("id", maskId);
			
			overallGroup.appendChild(mask);
			
			var shape = document.createElementNS("http://www.w3.org/2000/svg", "rect");
			shape.setAttribute("x", "0");
			shape.setAttribute("y", "0");
			shape.setAttribute("width", "100%");
			shape.setAttribute("height", "100%");
			shape.setAttribute("stroke", "none");
			shape.setAttribute("fill", "white");
			mask.appendChild(shape);
			
			var shape = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
			shape.setAttribute("stroke", "none");
			shape.setAttribute("fill", "black");
			mask.appendChild(shape);
			linkData.internal.els.mask = shape;
			
			var group = document.createElementNS("http://www.w3.org/2000/svg", "g");
			group.setAttribute('class', 'designer-link');
			group.setAttribute('data-link_id', linkId);
			overallGroup.appendChild(group);
			
			var shape = document.createElementNS("http://www.w3.org/2000/svg", "path");
			shape.setAttribute("stroke-width", this.options.linkWidth);
			shape.setAttribute("fill", "none");
			group.appendChild(shape);
			linkData.internal.els.path = shape;
			
			var shape = document.createElementNS("http://www.w3.org/2000/svg", "rect");
			shape.setAttribute("stroke", "none");
			shape.setAttribute("mask", "url(#"+maskId+")");
			group.appendChild(shape);
			linkData.internal.els.rect = shape;
			
			this._refreshLinkPositions(linkId);
			this.uncolorizeLink(linkId);
		},
		
		_refreshLinkPositions: function(linkId) {
			var linkData = this.data.links[linkId];
			
			
			var fromPosition = this.getConnectorPosition(linkData.fromQuestion, linkData.fromConnector);
			var toPosition = this.getConnectorPosition(linkData.toQuestion, linkData.toConnector);
			
			var fromX = fromPosition.x;
			var offsetFromX = fromPosition.width;
			var fromY = fromPosition.y;
			
			var toX = toPosition.x;
			var toY = toPosition.y;
			
			var distanceFromArrow = this.options.distanceFromArrow;
			
			linkData.internal.els.mask.setAttribute("points", fromX+','+(fromY - offsetFromX - distanceFromArrow)+' '+(fromX + offsetFromX + distanceFromArrow)+','+fromY+' '+fromX+','+(fromY + offsetFromX + distanceFromArrow));
			
			var bezierFromX = (fromX+offsetFromX + distanceFromArrow);
			var bezierToX = toX+1;
			var bezierIntensity = Math.min(100,Math.max(Math.abs(bezierFromX-bezierToX)/2,Math.abs(fromY-toY)));
			
			linkData.internal.els.path.setAttribute("d", 'M'+bezierFromX+','+(fromY)+' C'+(fromX + offsetFromX + distanceFromArrow + bezierIntensity)+','+fromY+' '+(toX - bezierIntensity)+','+toY+' '+bezierToX+','+toY);
			
			linkData.internal.els.rect.setAttribute("x", fromX);
			linkData.internal.els.rect.setAttribute("y", fromY - this.options.linkWidth / 2);
			linkData.internal.els.rect.setAttribute("width", offsetFromX + distanceFromArrow+1);
			linkData.internal.els.rect.setAttribute("height", this.options.linkWidth);
		},
		
		getQuestionCompleteData: function(questionData) {
			infos = $.extend(true, {}, questionData);
			for (var connectorId in infos.inputs) {
				if (infos.inputs[connectorId] == null) {
					delete infos.inputs[connectorId];
				}
			}
			for (var connectorId in infos.answers) {
				if (infos.answers[connectorId] == null) {
					delete infos.answers[connectorId];
				}
			}
			if (typeof infos.class == 'undefined') {
				infos.class = this.options.defaultQuestionClass;
			}
			return infos;
		},
		
		_getQuestionFullElement: function(questionData) {
			var infos = this.getQuestionCompleteData(questionData);
			
			var $question = $('<div class="designer-question"></div>');
			$question.addClass(infos.class);
			$question.attr('id', infos.code);
			//$question.append('<div class="designer-question-handle" style="position:relative;top:-8px;left:-8px;margin-bottom:-20px;"><i class="glyphicon glyphicon-asterisk" style="cursor: move;"></i></div>');
			var $question_title = $('<div class="designer-question-title"></div>');
			$question_title.append(infos.displayText);
			$question_title.appendTo($question);
			
			var $question_inputs_answers = $('<div class="designer-question-inputs-answers"></div>');
			$question_inputs_answers.appendTo($question);
			
			var $question_inputs = $('<div class="designer-question-inputs"></div>');
			$question_inputs.appendTo($question_inputs_answers);
			
			var $question_answers = $('<div class="designer-question-answers"></div>');
			$question_answers.appendTo($question_inputs_answers);
			
			var self = this;			
			var connectorArrows = {};
			var connectorSmallArrows = {};
			function addConnector(connectorKey, connectorInfos, $question_container, connectorType) {
				var $question_connector = $('<div class="designer-question-connector"></div>');
				$question_connector.appendTo($question_container);
				$question_connector.data('connector', connectorKey);
				$question_connector.data('connector_type', connectorType);
				
				var $question_connector_label = $('<div class="designer-question-connector-label"></div>');
				if (connectorInfos.label || (connectorType == 'answers' && !connectorInfos.labels)) {
					if (!connectorInfos.label) {
						$question_connector_label.append('<span>(no text)</span>');
					}
					else {
						$question_connector_label.text(connectorInfos.label);
					}
                    if (connectorInfos.class) $question_connector_label.addClass(connectorInfos.class);
                    if (connectorInfos.correct) $question_connector_label.addClass('answer-correct');
                    if (connectorInfos.style) $question_connector_label.attr('style', connectorInfos.style);
                    if (connectorInfos.code) $question_connector_label.attr('data-code', connectorInfos.code);
				}
				$.each(connectorInfos.labels, function(idx, itm) {
					var $sublabel = $('<div class="designer-question-connector-sublabel"></div>');				   
					$sublabel.text(itm.label);
					if (itm.class) $sublabel.addClass(itm.class);
                    if (itm.correct) $sublabel.addClass('answer-correct');
					if (itm.style) $sublabel.attr('style', itm.style);
                    if (itm.code) $sublabel.attr('data-code', itm.code);
					$sublabel.appendTo($question_connector_label);
				});
				if (connectorInfos.class) $question_connector_label.addClass(connectorInfos.class);
				if (connectorInfos.style) $question_connector_label.attr('style', connectorInfos.style);
				$question_connector_label.appendTo($question_connector);

				var $question_connector_arrow = $('<div class="designer-question-connector-arrow"></div>');
				
				$question_connector_arrow.appendTo($question_connector);
				
				var $question_connector_small_arrow = $('<div class="designer-question-connector-small-arrow"></div>');
				$question_connector_small_arrow.appendTo($question_connector);
				
				connectorArrows[connectorKey] = $question_connector_arrow;
				connectorSmallArrows[connectorKey] = $question_connector_small_arrow;
			}
			
			for (var key in infos.inputs) {
				addConnector(key, infos.inputs[key], $question_inputs, 'inputs');
			}
			
			for (var key in infos.answers) {
				addConnector(key, infos.answers[key], $question_answers, 'answers');
			}
			if (infos.questionType) $question.append('<span class="designer-question-question-type">'+(infos.questionTypeDisplay || infos.questionType)+'</span>')
			
			return {question: $question, displayText: $question_title, connectorArrows: connectorArrows, connectorSmallArrows: connectorSmallArrows};
		},
		
		getQuestionElement: function(questionData) {
			var fullElement = this._getQuestionFullElement(questionData);
			return fullElement.question;
		},
		
		createQuestion: function(questionId, questionData) {
			questionData = questionData || {};
			questionData.code = questionId;
			var fullElement = this._getQuestionFullElement(questionData);
			if (!this.options.onQuestionCreate(questionId, questionData, fullElement)) {
				return false;
			}
			
			var grid = this.options.grid;
			
			questionData.top = Math.round(questionData.top / grid) * grid;
			questionData.left = Math.round(questionData.left / grid) * grid;
			
			fullElement.question.appendTo(this.objs.layers.questions);
			fullElement.question.css({top: questionData.top, left: questionData.left});
			fullElement.question.data('question_id', questionId);
			
			this.data.questions[questionId] = questionData;
			this.data.questions[questionId].internal = {};
			this.data.questions[questionId].internal.els = fullElement;
			
			if (questionId == this.selectedQuestionId) {
				this._addSelectedClass(questionId);
			}
			
			var questionData = this.data.questions[questionId] ;
			
			var self = this;
			
			function questionChangedPosition(question_id, pos) {
				questionData.top = pos.top;
				questionData.left = pos.left;
				
				for (var linkId in self.data.links) {
					var linkData = self.data.links[linkId];
					if (linkData.fromQuestion == question_id || linkData.toQuestion == question_id) {
						self._refreshLinkPositions(linkId);
					}
				}
				if (self.suppressAfterChangeEvent != true) self.options.onAfterChange('questionChangedPosition');
			}
			
			// Small fix has been added in order to manage eventual zoom
			// http://stackoverflow.com/questions/2930092/jquery-draggable-with-zoom-problem
			if (this.options.canUserMoveQuestions) {
				var pointerX;
				var pointerY;
				fullElement.question.draggable({
					handle: '.designer-question-title',//'.designer-question-handle',
					start: function(e, ui) {
						if (self.lastOutputConnectorClicked != null) {
							e.preventDefault();
							return;
						}
						var elementOffset = self.element.offset();
						pointerX = (e.pageX - elementOffset.left) / self.positionRatio - parseInt($(e.target).css('left'));
						pointerY = (e.pageY - elementOffset.top) / self.positionRatio - parseInt($(e.target).css('top'));
					},
					drag: function(e, ui){
						var grid = self.options.grid;
						var elementOffset = self.element.offset();
						ui.position.left = Math.round(((e.pageX - elementOffset.left) / self.positionRatio - pointerX) / grid) * grid;
						ui.position.top = Math.round(((e.pageY - elementOffset.top) / self.positionRatio - pointerY) / grid) * grid;
						ui.offset.left = Math.round(ui.position.left + elementOffset.left);
						ui.offset.top = Math.round(ui.position.top + elementOffset.top);
						fullElement.question.css({left: ui.position.left, top: ui.position.top});
						questionChangedPosition($(this).data('question_id'), ui.position);
					},
					stop: function(e, ui){
						self._unsetTemporaryLink();
						questionChangedPosition($(this).data('question_id'), ui.position);
					},
				});
			}
			if (this.suppressAfterChangeEvent != true) this.options.onAfterChange('createQuestion');
		},
		
		_connectorClicked: function(question, connector, connectorCategory) {
			if (connectorCategory == 'answers') {
				var d = new Date();
				var currentTime = d.getTime();
				this.lastOutputConnectorClicked = {question: question, connector: connector};
				this.objs.layers.temporaryLink.show();
				var position = this.getConnectorPosition(question, connector);
				var x = position.x + position.width;
				var y = position.y;
				this.objs.temporaryLink.setAttribute('x1', x);
				this.objs.temporaryLink.setAttribute('y1', y);
				this._mousemove(x, y);
			}
			if (connectorCategory == 'inputs' && this.lastOutputConnectorClicked != null) {
				var linkData = {
					fromQuestion: this.lastOutputConnectorClicked.question,
					fromConnector: this.lastOutputConnectorClicked.connector,
					toQuestion: question,
					toConnector: connector
				};
				
				this.addLink(linkData);
				this._unsetTemporaryLink();
			}
		},
		
		_unsetTemporaryLink: function () {
			this.lastOutputConnectorClicked = null;
			this.objs.layers.temporaryLink.hide();
		},
		unsetTemporaryLink: function () {
			this._unsetTemporaryLink();
		},
		
		_mousemove: function(x, y, e) {
			if (this.lastOutputConnectorClicked != null) {
				this.objs.temporaryLink.setAttribute('x2', x);
				this.objs.temporaryLink.setAttribute('y2', y);
			}
		},
		
		_click: function(x, y, e) {
			var $target = $(e.target);
			if ($target.closest('.designer-question-connector').length == 0) {
				this._unsetTemporaryLink();
			}
			
			if ($target.closest('.designer-question').length == 0) {
				this.unselectQuestion();
			}
			
			if ($target.closest('.designer-link').length == 0) {
				this.unselectLink();
			}
		},
		
		_removeSelectedClassQuestions: function() {
			this.objs.layers.questions.find('.designer-question').removeClass('selected');
		},
		
		unselectQuestion: function() {
			if (this.selectedQuestionId != null) {
				if (!this.options.onQuestionUnselect()) {
					return;
				}
				this._removeSelectedClassQuestions();
				this.selectedQuestionId = null;
			}
		},
		
		_addSelectedClass: function(questionId) {
			this.data.questions[questionId].internal.els.question.addClass('selected');
		},
		
		selectQuestion: function(questionId) {
			if (!this.options.onQuestionSelect(questionId)) {
				return;
			}
			this.unselectLink();
			this._removeSelectedClassQuestions();
			this._addSelectedClass(questionId);
			this.selectedQuestionId = questionId;
		},
		
		getSelectedQuestionId: function() {
			return this.selectedQuestionId;
		},
		
		getSelectedLinkId: function() {
			return this.selectedLinkId;
		},
		
		// Found here : http://stackoverflow.com/questions/5560248/programmatically-lighten-or-darken-a-hex-color-or-rgb-and-blend-colors
		_shadeColor: function(color, percent) {   
			var f=parseInt(color.slice(1),16),t=percent<0?0:255,p=percent<0?percent*-1:percent,R=f>>16,G=f>>8&0x00FF,B=f&0x0000FF;
			return "#"+(0x1000000+(Math.round((t-R)*p)+R)*0x10000+(Math.round((t-G)*p)+G)*0x100+(Math.round((t-B)*p)+B)).toString(16).slice(1);
		},
		
		colorizeLink: function(linkId, color) {
			var linkData = this.data.links[linkId];
			linkData.internal.els.path.setAttribute('stroke', color);
			linkData.internal.els.rect.setAttribute('fill', color);
			linkData.internal.els.fromSmallConnector.css('border-left-color', color);
			linkData.internal.els.toSmallConnector.css('border-left-color', color);
		},
		
		uncolorizeLink: function(linkId) {
			this.colorizeLink(linkId, this.getLinkMainColor(linkId));
		},
		
		_connecterMouseOver: function(linkId) {
			if (this.selectedLinkId != linkId) {
				this.colorizeLink(linkId, this._shadeColor(this.getLinkMainColor(linkId), -0.4));
			}
		},
		
		_connecterMouseOut: function(linkId) {
			if (this.selectedLinkId != linkId) {
				this.uncolorizeLink(linkId);
			}
		},
		
		unselectLink: function() {
			if (this.selectedLinkId != null) {
				if (!this.options.onLinkUnselect()) {
					return;
				}
				this.uncolorizeLink(this.selectedLinkId, this.options.defaultSelectedLinkColor);
				this.selectedLinkId = null;
			}
		},
		
		selectLink: function(linkId) {
			this.unselectLink();
			if (!this.options.onLinkSelect(linkId)) {
				return;
			}
			this.unselectQuestion();
			this.selectedLinkId = linkId;
			this.colorizeLink(linkId, this.options.defaultSelectedLinkColor);
		},
		
		deleteQuestion: function(questionId) {
			this._deleteQuestion(questionId, false);
		},
		
		_deleteQuestion: function(questionId, replace) {
			if (!this.options.onQuestionDelete(questionId, replace)) {
				return false;
			}
			if (!replace) {
				for (var linkId in this.data.links) {
					var currentLink = this.data.links[linkId];
					if (currentLink.fromQuestion == questionId || currentLink.toQuestion == questionId) {
						this._deleteLink(linkId, true);
					}
				}
			}
			if (!replace && questionId == this.selectedQuestionId) {
				this.unselectQuestion();
			}
			this.data.questions[questionId].internal.els.question.remove();
			delete this.data.questions[questionId];
			if (this.suppressAfterChangeEvent != true) this.options.onAfterChange('deleteQuestion');
		},
		
		deleteLink: function(linkId) {
			this._deleteLink(linkId, false);
		},
		
		_deleteLink: function(linkId, forced) {
			if (this.selectedLinkId == linkId) {
				this.unselectLink();
			}
			if (!this.options.onLinkDelete(linkId, forced)) {
				if (!forced) {
					return;
				}
			}
			this.colorizeLink(linkId, 'transparent');
			this.data.links[linkId].internal.els.overallGroup.remove();
			delete this.data.links[linkId];
			if (this.suppressAfterChangeEvent != true) this.options.onAfterChange('deleteLink');
		},
		
		deleteSelected: function() {
			if (this.selectedLinkId != null) {
				this.deleteLink(this.selectedLinkId);
			}
			if (this.selectedQuestionId != null) {
				this.deleteQuestion(this.selectedQuestionId);
			}
		},
		
		setPositionRatio: function(positionRatio) {
			this.positionRatio = positionRatio;
		},
		
		getPositionRatio: function() {
			return this.positionRatio;
		},
		
		getData: function() {
			var keys = ['questions', 'links'];
			var data = $.extend(true, {}, this.data);
			for (var keyI in keys) {
				var key = keys[keyI];
				for (var objId in data[key]) {
					delete data[key][objId].internal;
				}
			}
			return data;
		},
		
		setQuestionTitle: function(questionId, title) {
			this.data.questions[questionId].internal.els.title.text(title);
			if (typeof this.data.questions[questionId] == 'undefined') {
				this.data.questions[questionId] = {};
			}
			this.data.questions[questionId].displayText = title;
		},
		
		getQuestionTitle: function(questionId) {
			return this.data.questions[questionId].displayText;
		},
		
		setQuestionData: function(questionId, questionData) {
			var infos = this.getQuestionCompleteData(questionData);
			for (var linkId in this.data.links) {
				var linkData = this.data.links[linkId];
				console.log(linkData, linkData.fromQuestion == linkId, typeof infos.answers[linkData.fromConnector] == 'undefined');
				if ((linkData.fromQuestion == questionId &&
					typeof infos.answers[linkData.fromConnector] == 'undefined') ||
					(linkData.toQuestion == questionId &&
					typeof infos.inputs[linkData.toConnector] == 'undefined')) {
						this._deleteLink(linkId, true);
						continue;
				}
			}
			this._deleteQuestion(questionId, true);
			this.createQuestion(questionId, questionData);
			this.redrawLinksLayer();
			if (this.suppressAfterChangeEvent != true) this.options.onAfterChange('setQuestionData');
		},
		
		getQuestionData: function(questionId) {
			var data = $.extend(true, {}, this.data.questions[questionId]);
			delete data.internal;
			return data;
		}
	});
});