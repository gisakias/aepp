/* https://kathigitis-aepp.gr/wp-content/plugins/contact-form-7/includes/js/scripts.js */
try{
( function( $ ) {

	'use strict';

	if ( typeof wpcf7 === 'undefined' || wpcf7 === null ) {
		return;
	}

	wpcf7 = $.extend( {
		cached: 0,
		inputs: []
	}, wpcf7 );

	$( function() {
		wpcf7.supportHtml5 = ( function() {
			var features = {};
			var input = document.createElement( 'input' );

			features.placeholder = 'placeholder' in input;

			var inputTypes = [ 'email', 'url', 'tel', 'number', 'range', 'date' ];

			$.each( inputTypes, function( index, value ) {
				input.setAttribute( 'type', value );
				features[ value ] = input.type !== 'text';
			} );

			return features;
		} )();

		$( 'div.wpcf7 > form' ).each( function() {
			var $form = $( this );
			wpcf7.initForm( $form );

			if ( wpcf7.cached ) {
				wpcf7.refill( $form );
			}
		} );
	} );

	wpcf7.getId = function( form ) {
		return parseInt( $( 'input[name="_wpcf7"]', form ).val(), 10 );
	};

	wpcf7.initForm = function( form ) {
		var $form = $( form );

		wpcf7.setStatus( $form, 'init' );

		$form.submit( function( event ) {
			if ( ! wpcf7.supportHtml5.placeholder ) {
				$( '[placeholder].placeheld', $form ).each( function( i, n ) {
					$( n ).val( '' ).removeClass( 'placeheld' );
				} );
			}

			if ( typeof window.FormData === 'function' ) {
				wpcf7.submit( $form );
				event.preventDefault();
			}
		} );

		$( '.wpcf7-submit', $form ).after( '<span class="ajax-loader"></span>' );

		wpcf7.toggleSubmit( $form );

		$form.on( 'click', '.wpcf7-acceptance', function() {
			wpcf7.toggleSubmit( $form );
		} );

		// Exclusive Checkbox
		$( '.wpcf7-exclusive-checkbox', $form ).on( 'click', 'input:checkbox', function() {
			var name = $( this ).attr( 'name' );
			$form.find( 'input:checkbox[name="' + name + '"]' ).not( this ).prop( 'checked', false );
		} );

		// Free Text Option for Checkboxes and Radio Buttons
		$( '.wpcf7-list-item.has-free-text', $form ).each( function() {
			var $freetext = $( ':input.wpcf7-free-text', this );
			var $wrap = $( this ).closest( '.wpcf7-form-control' );

			if ( $( ':checkbox, :radio', this ).is( ':checked' ) ) {
				$freetext.prop( 'disabled', false );
			} else {
				$freetext.prop( 'disabled', true );
			}

			$wrap.on( 'change', ':checkbox, :radio', function() {
				var $cb = $( '.has-free-text', $wrap ).find( ':checkbox, :radio' );

				if ( $cb.is( ':checked' ) ) {
					$freetext.prop( 'disabled', false ).focus();
				} else {
					$freetext.prop( 'disabled', true );
				}
			} );
		} );

		// Placeholder Fallback
		if ( ! wpcf7.supportHtml5.placeholder ) {
			$( '[placeholder]', $form ).each( function() {
				$( this ).val( $( this ).attr( 'placeholder' ) );
				$( this ).addClass( 'placeheld' );

				$( this ).focus( function() {
					if ( $( this ).hasClass( 'placeheld' ) ) {
						$( this ).val( '' ).removeClass( 'placeheld' );
					}
				} );

				$( this ).blur( function() {
					if ( '' === $( this ).val() ) {
						$( this ).val( $( this ).attr( 'placeholder' ) );
						$( this ).addClass( 'placeheld' );
					}
				} );
			} );
		}

		if ( wpcf7.jqueryUi && ! wpcf7.supportHtml5.date ) {
			$form.find( 'input.wpcf7-date[type="date"]' ).each( function() {
				$( this ).datepicker( {
					dateFormat: 'yy-mm-dd',
					minDate: new Date( $( this ).attr( 'min' ) ),
					maxDate: new Date( $( this ).attr( 'max' ) )
				} );
			} );
		}

		if ( wpcf7.jqueryUi && ! wpcf7.supportHtml5.number ) {
			$form.find( 'input.wpcf7-number[type="number"]' ).each( function() {
				$( this ).spinner( {
					min: $( this ).attr( 'min' ),
					max: $( this ).attr( 'max' ),
					step: $( this ).attr( 'step' )
				} );
			} );
		}

		// Character Count
		wpcf7.resetCounter( $form );

		// URL Input Correction
		$form.on( 'change', '.wpcf7-validates-as-url', function() {
			var val = $.trim( $( this ).val() );

			if ( val
			&& ! val.match( /^[a-z][a-z0-9.+-]*:/i )
			&& -1 !== val.indexOf( '.' ) ) {
				val = val.replace( /^\/+/, '' );
				val = 'https://' + val;
			}

			$( this ).val( val );
		} );
	};

	wpcf7.submit = function( form ) {
		if ( typeof window.FormData !== 'function' ) {
			return;
		}

		var $form = $( form );

		$( '.ajax-loader', $form ).addClass( 'is-active' );
		wpcf7.clearResponse( $form );

		var formData = new FormData( $form.get( 0 ) );

		var detail = {
			id: $form.closest( 'div.wpcf7' ).attr( 'id' ),
			status: 'init',
			inputs: [],
			formData: formData
		};

		$.each( $form.serializeArray(), function( i, field ) {
			if ( '_wpcf7' == field.name ) {
				detail.contactFormId = field.value;
			} else if ( '_wpcf7_version' == field.name ) {
				detail.pluginVersion = field.value;
			} else if ( '_wpcf7_locale' == field.name ) {
				detail.contactFormLocale = field.value;
			} else if ( '_wpcf7_unit_tag' == field.name ) {
				detail.unitTag = field.value;
			} else if ( '_wpcf7_container_post' == field.name ) {
				detail.containerPostId = field.value;
			} else if ( field.name.match( /^_/ ) ) {
				// do nothing
			} else {
				detail.inputs.push( field );
			}
		} );

		wpcf7.triggerEvent( $form.closest( 'div.wpcf7' ), 'beforesubmit', detail );

		var ajaxSuccess = function( data, status, xhr, $form ) {
			detail.id = $( data.into ).attr( 'id' );
			detail.status = data.status;
			detail.apiResponse = data;

			switch ( data.status ) {
				case 'init':
					wpcf7.setStatus( $form, 'init' );
					break;
				case 'validation_failed':
					$.each( data.invalid_fields, function( i, n ) {
						$( n.into, $form ).each( function() {
							wpcf7.notValidTip( this, n.message );
							$( '.wpcf7-form-control', this ).addClass( 'wpcf7-not-valid' );
							$( '[aria-invalid]', this ).attr( 'aria-invalid', 'true' );
						} );
					} );

					wpcf7.setStatus( $form, 'invalid' );
					wpcf7.triggerEvent( data.into, 'invalid', detail );
					break;
				case 'acceptance_missing':
					wpcf7.setStatus( $form, 'unaccepted' );
					wpcf7.triggerEvent( data.into, 'unaccepted', detail );
					break;
				case 'spam':
					wpcf7.setStatus( $form, 'spam' );
					wpcf7.triggerEvent( data.into, 'spam', detail );
					break;
				case 'aborted':
					wpcf7.setStatus( $form, 'aborted' );
					wpcf7.triggerEvent( data.into, 'aborted', detail );
					break;
				case 'mail_sent':
					wpcf7.setStatus( $form, 'sent' );
					wpcf7.triggerEvent( data.into, 'mailsent', detail );
					break;
				case 'mail_failed':
					wpcf7.setStatus( $form, 'failed' );
					wpcf7.triggerEvent( data.into, 'mailfailed', detail );
					break;
				default:
					wpcf7.setStatus( $form,
						'custom-' + data.status.replace( /[^0-9a-z]+/i, '-' )
					);
			}

			wpcf7.refill( $form, data );

			wpcf7.triggerEvent( data.into, 'submit', detail );

			if ( 'mail_sent' == data.status ) {
				$form.each( function() {
					this.reset();
				} );

				wpcf7.toggleSubmit( $form );
				wpcf7.resetCounter( $form );
			}

			if ( ! wpcf7.supportHtml5.placeholder ) {
				$form.find( '[placeholder].placeheld' ).each( function( i, n ) {
					$( n ).val( $( n ).attr( 'placeholder' ) );
				} );
			}

			$( '.wpcf7-response-output', $form )
				.html( '' ).append( data.message ).slideDown( 'fast' );

			$( '.screen-reader-response', $form.closest( '.wpcf7' ) ).each( function() {
				var $response = $( this );
				$response.html( '' ).append( data.message );

				if ( data.invalid_fields ) {
					var $invalids = $( '<ul></ul>' );

					$.each( data.invalid_fields, function( i, n ) {
						if ( n.idref ) {
							var $li = $( '<li></li>' ).append( $( '<a></a>' ).attr( 'href', '#' + n.idref ).append( n.message ) );
						} else {
							var $li = $( '<li></li>' ).append( n.message );
						}

						$invalids.append( $li );
					} );

					$response.append( $invalids );
				}

				$response.focus();
			} );

			if ( data.posted_data_hash ) {
				$form.find( 'input[name="_wpcf7_posted_data_hash"]' ).first()
					.val( data.posted_data_hash );
			}
		};

		$.ajax( {
			type: 'POST',
			url: wpcf7.apiSettings.getRoute(
				'/contact-forms/' + wpcf7.getId( $form ) + '/feedback' ),
			data: formData,
			dataType: 'json',
			processData: false,
			contentType: false
		} ).done( function( data, status, xhr ) {
			ajaxSuccess( data, status, xhr, $form );
			$( '.ajax-loader', $form ).removeClass( 'is-active' );
		} ).fail( function( xhr, status, error ) {
			var $e = $( '<div class="ajax-error"></div>' ).text( error.message );
			$form.after( $e );
		} );
	};

	wpcf7.triggerEvent = function( target, name, detail ) {
		var event = new CustomEvent( 'wpcf7' + name, {
			bubbles: true,
			detail: detail
		} );

		$( target ).get( 0 ).dispatchEvent( event );
	};

	wpcf7.setStatus = function( form, status ) {
		var $form = $( form );
		var prevStatus = $form.data( 'status' );

		$form.data( 'status', status );
		$form.addClass( status );

		if ( prevStatus && prevStatus !== status ) {
			$form.removeClass( prevStatus );
		}
	}

	wpcf7.toggleSubmit = function( form, state ) {
		var $form = $( form );
		var $submit = $( 'input:submit', $form );

		if ( typeof state !== 'undefined' ) {
			$submit.prop( 'disabled', ! state );
			return;
		}

		if ( $form.hasClass( 'wpcf7-acceptance-as-validation' ) ) {
			return;
		}

		$submit.prop( 'disabled', false );

		$( '.wpcf7-acceptance', $form ).each( function() {
			var $span = $( this );
			var $input = $( 'input:checkbox', $span );

			if ( ! $span.hasClass( 'optional' ) ) {
				if ( $span.hasClass( 'invert' ) && $input.is( ':checked' )
				|| ! $span.hasClass( 'invert' ) && ! $input.is( ':checked' ) ) {
					$submit.prop( 'disabled', true );
					return false;
				}
			}
		} );
	};

	wpcf7.resetCounter = function( form ) {
		var $form = $( form );

		$( '.wpcf7-character-count', $form ).each( function() {
			var $count = $( this );
			var name = $count.attr( 'data-target-name' );
			var down = $count.hasClass( 'down' );
			var starting = parseInt( $count.attr( 'data-starting-value' ), 10 );
			var maximum = parseInt( $count.attr( 'data-maximum-value' ), 10 );
			var minimum = parseInt( $count.attr( 'data-minimum-value' ), 10 );

			var updateCount = function( target ) {
				var $target = $( target );
				var length = $target.val().length;
				var count = down ? starting - length : length;
				$count.attr( 'data-current-value', count );
				$count.text( count );

				if ( maximum && maximum < length ) {
					$count.addClass( 'too-long' );
				} else {
					$count.removeClass( 'too-long' );
				}

				if ( minimum && length < minimum ) {
					$count.addClass( 'too-short' );
				} else {
					$count.removeClass( 'too-short' );
				}
			};

			$( ':input[name="' + name + '"]', $form ).each( function() {
				updateCount( this );

				$( this ).keyup( function() {
					updateCount( this );
				} );
			} );
		} );
	};

	wpcf7.notValidTip = function( target, message ) {
		var $target = $( target );
		$( '.wpcf7-not-valid-tip', $target ).remove();

		$( '<span></span>' ).attr( {
			'class': 'wpcf7-not-valid-tip',
			'role': 'alert',
			'aria-hidden': 'true',
		} ).text( message ).appendTo( $target );

		if ( $target.is( '.use-floating-validation-tip *' ) ) {
			var fadeOut = function( target ) {
				$( target ).not( ':hidden' ).animate( {
					opacity: 0
				}, 'fast', function() {
					$( this ).css( { 'z-index': -100 } );
				} );
			};

			$target.on( 'mouseover', '.wpcf7-not-valid-tip', function() {
				fadeOut( this );
			} );

			$target.on( 'focus', ':input', function() {
				fadeOut( $( '.wpcf7-not-valid-tip', $target ) );
			} );
		}
	};

	wpcf7.refill = function( form, data ) {
		var $form = $( form );

		var refillCaptcha = function( $form, items ) {
			$.each( items, function( i, n ) {
				$form.find( ':input[name="' + i + '"]' ).val( '' );
				$form.find( 'img.wpcf7-captcha-' + i ).attr( 'src', n );
				var match = /([0-9]+)\.(png|gif|jpeg)$/.exec( n );
				$form.find( 'input:hidden[name="_wpcf7_captcha_challenge_' + i + '"]' ).attr( 'value', match[ 1 ] );
			} );
		};

		var refillQuiz = function( $form, items ) {
			$.each( items, function( i, n ) {
				$form.find( ':input[name="' + i + '"]' ).val( '' );
				$form.find( ':input[name="' + i + '"]' ).siblings( 'span.wpcf7-quiz-label' ).text( n[ 0 ] );
				$form.find( 'input:hidden[name="_wpcf7_quiz_answer_' + i + '"]' ).attr( 'value', n[ 1 ] );
			} );
		};

		if ( typeof data === 'undefined' ) {
			$.ajax( {
				type: 'GET',
				url: wpcf7.apiSettings.getRoute(
					'/contact-forms/' + wpcf7.getId( $form ) + '/refill' ),
				beforeSend: function( xhr ) {
					var nonce = $form.find( ':input[name="_wpnonce"]' ).val();

					if ( nonce ) {
						xhr.setRequestHeader( 'X-WP-Nonce', nonce );
					}
				},
				dataType: 'json'
			} ).done( function( data, status, xhr ) {
				if ( data.captcha ) {
					refillCaptcha( $form, data.captcha );
				}

				if ( data.quiz ) {
					refillQuiz( $form, data.quiz );
				}
			} );

		} else {
			if ( data.captcha ) {
				refillCaptcha( $form, data.captcha );
			}

			if ( data.quiz ) {
				refillQuiz( $form, data.quiz );
			}
		}
	};

	wpcf7.clearResponse = function( form ) {
		var $form = $( form );
		$form.siblings( '.screen-reader-response' ).html( '' );

		$( '.wpcf7-not-valid-tip', $form ).remove();
		$( '[aria-invalid]', $form ).attr( 'aria-invalid', 'false' );
		$( '.wpcf7-form-control', $form ).removeClass( 'wpcf7-not-valid' );

		$( '.wpcf7-response-output', $form ).hide().empty();
	};

	wpcf7.apiSettings.getRoute = function( path ) {
		var url = wpcf7.apiSettings.root;

		url = url.replace(
			wpcf7.apiSettings.namespace,
			wpcf7.apiSettings.namespace + path );

		return url;
	};

} )( jQuery );

/*
 * Polyfill for Internet Explorer
 * See https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/CustomEvent
 */
( function () {
	if ( typeof window.CustomEvent === "function" ) return false;

	function CustomEvent ( event, params ) {
		params = params || { bubbles: false, cancelable: false, detail: undefined };
		var evt = document.createEvent( 'CustomEvent' );
		evt.initCustomEvent( event,
			params.bubbles, params.cancelable, params.detail );
		return evt;
	}

	CustomEvent.prototype = window.Event.prototype;

	window.CustomEvent = CustomEvent;
} )();

}
catch(e){console.error("An error has occurred: "+e.stack);}
/* https://kathigitis-aepp.gr/wp-includes/js/jquery/ui/core.min.js */
try{
/*!
 * jQuery UI Core 1.11.4
 * https://jqueryui.com
 *
 * Copyright jQuery Foundation and other contributors
 * Released under the MIT license.
 * https://jquery.org/license
 *
 * https://api.jqueryui.com/category/ui-core/
 */
!function(e){"function"==typeof define&&define.amd?define(["jquery"],e):e(jQuery)}(function(a){var e,t,n,i;function r(e,t){var n,i,r,o=e.nodeName.toLowerCase();return"area"===o?(i=(n=e.parentNode).name,!(!e.href||!i||"map"!==n.nodeName.toLowerCase())&&(!!(r=a("img[usemap='#"+i+"']")[0])&&s(r))):(/^(input|select|textarea|button|object)$/.test(o)?!e.disabled:"a"===o&&e.href||t)&&s(e)}function s(e){return a.expr.filters.visible(e)&&!a(e).parents().addBack().filter(function(){return"hidden"===a.css(this,"visibility")}).length}a.ui=a.ui||{},a.extend(a.ui,{version:"1.11.4",keyCode:{BACKSPACE:8,COMMA:188,DELETE:46,DOWN:40,END:35,ENTER:13,ESCAPE:27,HOME:36,LEFT:37,PAGE_DOWN:34,PAGE_UP:33,PERIOD:190,RIGHT:39,SPACE:32,TAB:9,UP:38}}),a.fn.extend({scrollParent:function(e){var t=this.css("position"),n="absolute"===t,i=e?/(auto|scroll|hidden)/:/(auto|scroll)/,r=this.parents().filter(function(){var e=a(this);return(!n||"static"!==e.css("position"))&&i.test(e.css("overflow")+e.css("overflow-y")+e.css("overflow-x"))}).eq(0);return"fixed"!==t&&r.length?r:a(this[0].ownerDocument||document)},uniqueId:(e=0,function(){return this.each(function(){this.id||(this.id="ui-id-"+ ++e)})}),removeUniqueId:function(){return this.each(function(){/^ui-id-\d+$/.test(this.id)&&a(this).removeAttr("id")})}}),a.extend(a.expr[":"],{data:a.expr.createPseudo?a.expr.createPseudo(function(t){return function(e){return!!a.data(e,t)}}):function(e,t,n){return!!a.data(e,n[3])},focusable:function(e){return r(e,!isNaN(a.attr(e,"tabindex")))},tabbable:function(e){var t=a.attr(e,"tabindex"),n=isNaN(t);return(n||0<=t)&&r(e,!n)}}),a("<a>").outerWidth(1).jquery||a.each(["Width","Height"],function(e,n){var r="Width"===n?["Left","Right"]:["Top","Bottom"],i=n.toLowerCase(),o={innerWidth:a.fn.innerWidth,innerHeight:a.fn.innerHeight,outerWidth:a.fn.outerWidth,outerHeight:a.fn.outerHeight};function s(e,t,n,i){return a.each(r,function(){t-=parseFloat(a.css(e,"padding"+this))||0,n&&(t-=parseFloat(a.css(e,"border"+this+"Width"))||0),i&&(t-=parseFloat(a.css(e,"margin"+this))||0)}),t}a.fn["inner"+n]=function(e){return void 0===e?o["inner"+n].call(this):this.each(function(){a(this).css(i,s(this,e)+"px")})},a.fn["outer"+n]=function(e,t){return"number"!=typeof e?o["outer"+n].call(this,e):this.each(function(){a(this).css(i,s(this,e,!0,t)+"px")})}}),a.fn.addBack||(a.fn.addBack=function(e){return this.add(null==e?this.prevObject:this.prevObject.filter(e))}),a("<a>").data("a-b","a").removeData("a-b").data("a-b")&&(a.fn.removeData=(t=a.fn.removeData,function(e){return arguments.length?t.call(this,a.camelCase(e)):t.call(this)})),a.ui.ie=!!/msie [\w.]+/.exec(navigator.userAgent.toLowerCase()),a.fn.extend({focus:(i=a.fn.focus,function(t,n){return"number"==typeof t?this.each(function(){var e=this;setTimeout(function(){a(e).focus(),n&&n.call(e)},t)}):i.apply(this,arguments)}),disableSelection:(n="onselectstart"in document.createElement("div")?"selectstart":"mousedown",function(){return this.bind(n+".ui-disableSelection",function(e){e.preventDefault()})}),enableSelection:function(){return this.unbind(".ui-disableSelection")},zIndex:function(e){if(void 0!==e)return this.css("zIndex",e);if(this.length)for(var t,n,i=a(this[0]);i.length&&i[0]!==document;){if(("absolute"===(t=i.css("position"))||"relative"===t||"fixed"===t)&&(n=parseInt(i.css("zIndex"),10),!isNaN(n)&&0!==n))return n;i=i.parent()}return 0}}),a.ui.plugin={add:function(e,t,n){var i,r=a.ui[e].prototype;for(i in n)r.plugins[i]=r.plugins[i]||[],r.plugins[i].push([t,n[i]])},call:function(e,t,n,i){var r,o=e.plugins[t];if(o&&(i||e.element[0].parentNode&&11!==e.element[0].parentNode.nodeType))for(r=0;r<o.length;r++)e.options[o[r][0]]&&o[r][1].apply(e.element,n)}}});

}
catch(e){console.error("An error has occurred: "+e.stack);}
/* https://kathigitis-aepp.gr/wp-content/plugins/ultimate-social-media-plus/js/shuffle/modernizr.custom.min.js */
try{
/* Modernizr 2.6.2 (Custom Build) | MIT & BSD
 * Build: https://modernizr.com/download/#-csstransforms-csstransforms3d-csstransitions-cssclasses-prefixed-teststyles-testprop-testallprops-prefixes-domprefixes
 */
window.Modernizr=function(a,b,c){function z(a){j.cssText=a}function A(a,b){return z(m.join(a+";")+(b||""))}function B(a,b){return typeof a===b}function C(a,b){return!!~(""+a).indexOf(b)}function D(a,b){for(var d in a){var e=a[d];if(!C(e,"-")&&j[e]!==c)return b=="pfx"?e:!0}return!1}function E(a,b,d){for(var e in a){var f=b[a[e]];if(f!==c)return d===!1?a[e]:B(f,"function")?f.bind(d||b):f}return!1}function F(a,b,c){var d=a.charAt(0).toUpperCase()+a.slice(1),e=(a+" "+o.join(d+" ")+d).split(" ");return B(b,"string")||B(b,"undefined")?D(e,b):(e=(a+" "+p.join(d+" ")+d).split(" "),E(e,b,c))}var d="2.6.2",e={},f=!0,g=b.documentElement,h="modernizr",i=b.createElement(h),j=i.style,k,l={}.toString,m=" -webkit- -moz- -o- -ms- ".split(" "),n="Webkit Moz O ms",o=n.split(" "),p=n.toLowerCase().split(" "),q={},r={},s={},t=[],u=t.slice,v,w=function(a,c,d,e){var f,i,j,k,l=b.createElement("div"),m=b.body,n=m||b.createElement("body");if(parseInt(d,10))while(d--)j=b.createElement("div"),j.id=e?e[d]:h+(d+1),l.appendChild(j);return f=["&#173;",'<style id="s',h,'">',a,"</style>"].join(""),l.id=h,(m?l:n).innerHTML+=f,n.appendChild(l),m||(n.style.background="",n.style.overflow="hidden",k=g.style.overflow,g.style.overflow="hidden",g.appendChild(n)),i=c(l,a),m?l.parentNode.removeChild(l):(n.parentNode.removeChild(n),g.style.overflow=k),!!i},x={}.hasOwnProperty,y;!B(x,"undefined")&&!B(x.call,"undefined")?y=function(a,b){return x.call(a,b)}:y=function(a,b){return b in a&&B(a.constructor.prototype[b],"undefined")},Function.prototype.bind||(Function.prototype.bind=function(b){var c=this;if(typeof c!="function")throw new TypeError;var d=u.call(arguments,1),e=function(){if(this instanceof e){var a=function(){};a.prototype=c.prototype;var f=new a,g=c.apply(f,d.concat(u.call(arguments)));return Object(g)===g?g:f}return c.apply(b,d.concat(u.call(arguments)))};return e}),q.csstransforms=function(){return!!F("transform")},q.csstransforms3d=function(){var a=!!F("perspective");return a&&"webkitPerspective"in g.style&&w("@media (transform-3d),(-webkit-transform-3d){#modernizr{left:9px;position:absolute;height:3px;}}",function(b,c){a=b.offsetLeft===9&&b.offsetHeight===3}),a},q.csstransitions=function(){return F("transition")};for(var G in q)y(q,G)&&(v=G.toLowerCase(),e[v]=q[G](),t.push((e[v]?"":"no-")+v));return e.addTest=function(a,b){if(typeof a=="object")for(var d in a)y(a,d)&&e.addTest(d,a[d]);else{a=a.toLowerCase();if(e[a]!==c)return e;b=typeof b=="function"?b():b,typeof f!="undefined"&&f&&(g.className+=" "+(b?"":"no-")+a),e[a]=b}return e},z(""),i=k=null,e._version=d,e._prefixes=m,e._domPrefixes=p,e._cssomPrefixes=o,e.testProp=function(a){return D([a])},e.testAllProps=F,e.testStyles=w,e.prefixed=function(a,b,c){return b?F(a,b,c):F(a,"pfx")},g.className=g.className.replace(/(^|\s)no-js(\s|$)/,"$1$2")+(f?" js "+t.join(" "):""),e}(this,this.document);

}
catch(e){console.error("An error has occurred: "+e.stack);}
/* https://kathigitis-aepp.gr/wp-content/plugins/ultimate-social-media-plus/js/custom.js */
try{
jQuery(document).ready(function (e) {
    jQuery("#sfsi_plus_floater").attr("data-top", jQuery(document).height());
});

function sfsiplus_showErrorSuc(s, i, e) {
    if ("error" == s) var t = "errorMsg";
    else var t = "sucMsg";
    return SFSI(".tab" + e + ">." + t).html(i), SFSI(".tab" + e + ">." + t).show(),
        SFSI(".tab" + e + ">." + t).effect("highlight", {}, 5e3), setTimeout(function () {
            SFSI("." + t).slideUp("slow");
        }, 5e3), !1;
}

function sfsiplus_beForeLoad() {
    SFSI(".loader-img").show(), SFSI(".save_button >a").html("Saving..."), SFSI(".save_button >a").css("pointer-events", "none");
}

function sfsi_plus_make_popBox() {
    var s = 0;
    SFSI(".plus_sfsi_sample_icons >li").each(function () {
            "none" != SFSI(this).css("display") && (s = 1);
        }), 0 == s ? SFSI(".sfsi_plus_Popinner").hide() : SFSI(".sfsi_plus_Popinner").show(), "" != SFSI('input[name="sfsi_plus_popup_text"]').val() ? (SFSI(".sfsi_plus_Popinner >h2").html(SFSI('input[name="sfsi_plus_popup_text"]').val()),
            SFSI(".sfsi_plus_Popinner >h2").show()) : SFSI(".sfsi_plus_Popinner >h2").hide(), SFSI(".sfsi_plus_Popinner").css({
            "border-color": SFSI('input[name="sfsi_plus_popup_border_color"]').val(),
            "border-width": SFSI('input[name="sfsi_plus_popup_border_thickness"]').val(),
            "border-style": "solid"
        }), SFSI(".sfsi_plus_Popinner").css("background-color", SFSI('input[name="sfsi_plus_popup_background_color"]').val()),
        SFSI(".sfsi_plus_Popinner h2").css("font-family", SFSI("#sfsi_plus_popup_font").val()), SFSI(".sfsi_plus_Popinner h2").css("font-style", SFSI("#sfsi_plus_popup_fontStyle").val()),
        SFSI(".sfsi_plus_Popinner >h2").css("font-size", parseInt(SFSI('input[name="sfsi_plus_popup_fontSize"]').val())),
        SFSI(".sfsi_plus_Popinner >h2").css("color", SFSI('input[name="sfsi_plus_popup_fontColor"]').val() + " !important"),
        "yes" == SFSI('input[name="sfsi_plus_popup_border_shadow"]:checked').val() ? SFSI(".sfsi_plus_Popinner").css("box-shadow", "12px 30px 18px #CCCCCC") : SFSI(".sfsi_plus_Popinner").css("box-shadow", "none");
}

function sfsi_plus_stick_widget(s) {
    0 == sfsiplus_initTop.length && (SFSI(".sfsi_plus_widget").each(function (s) {
        sfsiplus_initTop[s] = SFSI(this).position().top;
    }));
    var i = SFSI(window).scrollTop(),
        e = [],
        t = [];
    SFSI(".sfsi_plus_widget").each(function (s) {
        e[s] = SFSI(this).position().top, t[s] = SFSI(this);
    });
    var n = !1;
    for (var o in e) {
        var a = parseInt(o) + 1;
        e[o] < i && e[a] > i && a < e.length ? (SFSI(t[o]).css({
            position: "fixed",
            top: s
        }), SFSI(t[a]).css({
            position: "",
            top: sfsiplus_initTop[a]
        }), n = !0) : SFSI(t[o]).css({
            position: "",
            top: sfsiplus_initTop[o]
        });
    }
    if (!n) {
        var r = e.length - 1,
            c = -1;
        e.length > 1 && (c = e.length - 2), sfsiplus_initTop[r] < i ? (SFSI(t[r]).css({
            position: "fixed",
            top: s
        }), c >= 0 && SFSI(t[c]).css({
            position: "",
            top: sfsiplus_initTop[c]
        })) : (SFSI(t[r]).css({
            position: "",
            top: sfsiplus_initTop[r]
        }), c >= 0 && e[c] < i);
    }
}

function sfsi_plus_float_widget(s) {
    function iplus() {
        rplus = "Microsoft Internet Explorer" === navigator.appName ? aplus - document.documentElement.scrollTop : aplus - window.pageYOffset,
            Math.abs(rplus) > 0 ? (window.removeEventListener("scroll", iplus), aplus -= rplus * oplus, SFSI("#sfsi_plus_floater").css({
                top: (aplus + t).toString() + "px"
            }), setTimeout(iplus, n)) : window.addEventListener("scroll", iplus, !1);

    }
    /*function eplus()
	{
		var documentheight = SFSI("#sfsi_plus_floater").attr("data-top");
		var fltrhght = parseInt(SFSI("#sfsi_plus_floater").height());
		var fltrtp = parseInt(SFSI("#sfsi_plus_floater").css("top"));
		if(parseInt(fltrhght)+parseInt(fltrtp) <=documentheight)
		{
			window.addEventListener("scroll", iplus, !1);
		}
		else
		{
			window.removeEventListener("scroll", iplus);
			SFSI("#sfsi_plus_floater").css("top",documentheight+"px");
		}
	}*/

    SFSI(window).scroll(function () {
        var documentheight = SFSI("#sfsi_plus_floater").attr("data-top");
        var fltrhght = parseInt(SFSI("#sfsi_plus_floater").height());
        var fltrtp = parseInt(SFSI("#sfsi_plus_floater").css("top"));
        if (parseInt(fltrhght) + parseInt(fltrtp) <= documentheight) {
            window.addEventListener("scroll", iplus, !1);
        } else {
            window.removeEventListener("scroll", iplus);
            SFSI("#sfsi_plus_floater").css("top", documentheight + "px");
        }
    });

    if ("center" == s) {
        var t = (jQuery(window).height() - SFSI("#sfsi_plus_floater").height()) / 2;
    } else if ("bottom" == s) {
        var t = window.innerHeight - (SFSI("#sfsi_plus_floater").height() + parseInt(SFSI('#sfsi_plus_floater').css('margin-bottom')));
    } else {
        var t = parseInt(s);
    }
    var n = 50,
        oplus = .1,
        aplus = 0,
        rplus = 0;
    //SFSI("#sfsi_plus_floater"), window.onscroll = eplus;
}

function sfsi_plus_shuffle() {
    var s = [];
    SFSI(".sfsi_plus_wicons ").each(function (i) {
        SFSI(this).text().match(/^\s*$/) || (s[i] = "<div class='" + SFSI(this).attr("class") + "'>" + SFSI(this).html() + "</div>",
            SFSI(this).fadeOut("slow"), SFSI(this).insertBefore(SFSI(this).prev(".sfsi_plus_wicons")),
            SFSI(this).fadeIn("slow"));
    }), s = sfsiplus_Shuffle(s), $("#sfsi_plus_wDiv").html("");
    for (var i = 0; i < testArray.length; i++) $("#sfsi_plus_wDiv").append(s[i]);
}

function sfsiplus_Shuffle(s) {
    for (var i, e, t = s.length; t; i = parseInt(Math.random() * t), e = s[--t], s[t] = s[i],
        s[i] = e);
    return s;
}

function sfsi_plus_setCookie(s, i, e) {
    var t = new Date();
    t.setTime(t.getTime() + 1e3 * 60 * 60 * 24 * e);
    var n = "expires=" + t.toGMTString();
    document.cookie = s + "=" + i + "; " + n;
}

function sfsfi_plus_getCookie(s) {
    for (var i = s + "=", e = document.cookie.split(";"), t = 0; t < e.length; t++) {
        var n = e[t].trim();
        if (0 == n.indexOf(i)) return n.substring(i.length, n.length);
    }
    return "";
}

function sfsi_plus_hideFooter() {}

window.onerror = function () {}, SFSI = jQuery.noConflict(), SFSI(window).on('load', function () {
    SFSI("#sfpluspageLoad").fadeOut(2e3);
});

var global_error = 0;

SFSI(document).ready(function (s) {

    //changes done {Monad}
    SFSI("head").append('<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />'),
        SFSI("head").append('<meta http-equiv="Pragma" content="no-cache" />'), SFSI("head").append('<meta http-equiv="Expires" content="0" />'),
        SFSI(document).click(function (s) {
            var i = SFSI(".sfsi_plus_FrntInner_changedmonad"),
                e = SFSI(".sfsi_plus_wDiv"),
                t = SFSI("#at15s");
            i.is(s.target) || 0 !== i.has(s.target).length || e.is(s.target) || 0 !== e.has(s.target).length || t.is(s.target) || 0 !== t.has(s.target).length || i.fadeOut();
        }),
        SFSI("div.sfsiplusid_linkedin").find(".icon4").find("a").find("img").mouseover(function () {
            SFSI(this).attr("src", sfsi_plus_ajax_object.plugin_url + "images/visit_icons/linkedIn_hover.svg");
        }),
        SFSI("div.sfsiplusid_linkedin").find(".icon4").find("a").find("img").mouseleave(function () {
            SFSI(this).attr("src", sfsi_plus_ajax_object.plugin_url + "images/visit_icons/linkedIn.svg");
        }),
        SFSI("div.sfsiplusid_youtube").find(".icon1").find("a").find("img").mouseover(function () {
            SFSI(this).attr("src", sfsi_plus_ajax_object.plugin_url + "images/visit_icons/youtube_hover.svg");
        }),
        SFSI("div.sfsiplusid_youtube").find(".icon1").find("a").find("img").mouseleave(function () {
            SFSI(this).attr("src", sfsi_plus_ajax_object.plugin_url + "images/visit_icons/youtube.svg");
        }),
        SFSI("div.sfsiplusid_facebook").find(".icon1").find("a").find("img").mouseover(function () {
            SFSI(this).css("opacity", "0.9");
        }),
        SFSI("div.sfsiplusid_facebook").find(".icon1").find("a").find("img").mouseleave(function () {
            SFSI(this).css("opacity", "1");
        }),
        SFSI("div.sfsiplusid_twitter").find(".cstmicon1").find("a").find("img").mouseover(function () {
            SFSI(this).css("opacity", "0.9");
        }),
        SFSI("div.sfsiplusid_twitter").find(".cstmicon1").find("a").find("img").mouseleave(function () {
            SFSI(this).css("opacity", "1");
        }),
        SFSI(".pop-up").on("click", function () {
            ("fbex-s2" == SFSI(this).attr("data-id") || "linkex-s2" == SFSI(this).attr("data-id")) && (SFSI("." + SFSI(this).attr("data-id")).hide(),
                SFSI("." + SFSI(this).attr("data-id")).css("opacity", "1"), SFSI("." + SFSI(this).attr("data-id")).css("z-index", "1000")),
            SFSI("." + SFSI(this).attr("data-id")).show("slow");
        }),
        /*SFSI("#close_popup").live("click", function() {*/
        SFSI(document).on("click", '#close_popup', function () {
            SFSI(".read-overlay").hide("slow");
        });
    var e = 0;
    sfsi_plus_make_popBox(),
        SFSI('input[name="sfsi_plus_popup_text"] ,input[name="sfsi_plus_popup_background_color"],input[name="sfsi_plus_popup_border_color"],input[name="sfsi_plus_popup_border_thickness"],input[name="sfsi_plus_popup_fontSize"],input[name="sfsi_plus_popup_fontColor"]').on("keyup", sfsi_plus_make_popBox),
        SFSI('input[name="sfsi_plus_popup_text"] ,input[name="sfsi_plus_popup_background_color"],input[name="sfsi_plus_popup_border_color"],input[name="sfsi_plus_popup_border_thickness"],input[name="sfsi_plus_popup_fontSize"],input[name="sfsi_plus_popup_fontColor"]').on("focus", sfsi_plus_make_popBox),
        SFSI("#sfsi_plus_popup_font ,#sfsi_plus_popup_fontStyle").on("change", sfsi_plus_make_popBox),
        /*SFSI(".radio").live("click", function(){*/
        SFSI(document).on("click", '.radio', function () {
            var s = SFSI(this).parent().find("input:radio:first");
            "sfsi_plus_popup_border_shadow" == s.attr("name") && sfsi_plus_make_popBox();
        }), /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? SFSI("img.sfsi_wicon").on("click", function (s) {
            s.stopPropagation();
            var i = SFSI("#sfsi_plus_floater_sec").val();
            SFSI("div.sfsi_plus_wicons").css("z-index", "0"), SFSI(this).parent().parent().parent().siblings("div.sfsi_plus_wicons").find(".sfsiplus_inerCnt").find("div.sfsi_plus_tool_tip_2").hide(),
                SFSI(this).parent().parent().parent().parent().siblings("li").length > 0 && (SFSI(this).parent().parent().parent().parent().siblings("li").find("div.sfsi_plus_tool_tip_2").css("z-index", "0"),
                    SFSI(this).parent().parent().parent().parent().siblings("li").find("div.sfsi_plus_wicons").find(".sfsiplus_inerCnt").find("div.sfsi_plus_tool_tip_2").hide()),
                SFSI(this).parent().parent().parent().css("z-index", "1000000"), SFSI(this).parent().parent().css({
                    "z-index": "999"
                }), SFSI(this).attr("data-effect") && "fade_in" == SFSI(this).attr("data-effect") && (SFSI(this).parentsUntil("div").siblings("div.sfsi_plus_tool_tip_2").css({
                    opacity: 1,
                    "z-index": 10
                }), SFSI(this).parent().css("opacity", "1")), SFSI(this).attr("data-effect") && "scale" == SFSI(this).attr("data-effect") && (SFSI(this).parent().addClass("scale"),
                    SFSI(this).parentsUntil("div").siblings("div.sfsi_plus_tool_tip_2").css({
                        opacity: 1,
                        "z-index": 10
                    }), SFSI(this).parent().css("opacity", "1")), SFSI(this).attr("data-effect") && "combo" == SFSI(this).attr("data-effect") && (SFSI(this).parent().addClass("scale"),
                    SFSI(this).parent().css("opacity", "1"), SFSI(this).parentsUntil("div").siblings("div.sfsi_plus_tool_tip_2").css({
                        opacity: 1,
                        "z-index": 10
                    })), ("top-left" == i || "top-right" == i) && SFSI(this).parent().parent().parent().parent("#sfsi_plus_floater").length > 0 && "sfsi_plus_floater" == SFSI(this).parent().parent().parent().parent().attr("id") ? (SFSI(this).parentsUntil("div").siblings("div.sfsi_plus_tool_tip_2").addClass("sfsi_plc_btm"),
                    SFSI(this).parentsUntil("div").siblings("div.sfsi_plus_tool_tip_2").find("span.bot_arow").addClass("top_big_arow"),
                    SFSI(this).parentsUntil("div").siblings("div.sfsi_plus_tool_tip_2").css({
                        opacity: 1,
                        "z-index": 10
                    }), SFSI(this).parentsUntil("div").siblings("div.sfsi_plus_tool_tip_2").show()) : (SFSI(this).parentsUntil("div").siblings("div.sfsi_plus_tool_tip_2").find("span.bot_arow").removeClass("top_big_arow"),
                    SFSI(this).parentsUntil("div").siblings("div.sfsi_plus_tool_tip_2").removeClass("sfsi_plc_btm"),
                    SFSI(this).parentsUntil("div").siblings("div.sfsi_plus_tool_tip_2").css({
                        opacity: 1,
                        "z-index": 1e3
                    }), SFSI(this).parentsUntil("div").siblings("div.sfsi_plus_tool_tip_2").show());
            // if(SFSI(this).parentsUntil("div").siblings("div.sfsi_plus_tool_tip_2").attr('id')=="sfsiplusid_twitter" || SFSI(this).parentsUntil("div").siblings("div.sfsi_plus_tool_tip_2").hasClass("sfsiplusid_twitter")){
            //     sfsi_plus_clone = SFSI(this).parentsUntil("div").siblings("div.sfsi_plus_tool_tip_2").find(".sfsi_plus_inside .icon2 iframe').clone();
            //     SFSI(this).parentsUntil("div").siblings("div.sfsi_plus_tool_tip_2").find(".sfsi_plus_inside .icon2 iframe').detach().remove();
            //     SFSI(this).parentsUntil("div").siblings("div.sfsi_plus_tool_tip_2").find(".sfsi_plus_inside .icon2').append(sfsi_plus_clone);
            // }

        }) : SFSI(document).on("mouseenter", "img.sfsi_wicon", function () {
            var s = SFSI("#sfsi_plus_floater_sec").val();
            SFSI("div.sfsi_plus_wicons").css("z-index", "0"), SFSI(this).parent().parent().parent().siblings("div.sfsi_plus_wicons").find(".sfsiplus_inerCnt").find("div.sfsi_plus_tool_tip_2").hide(),
                SFSI(this).parent().parent().parent().parent().siblings("li").length > 0 && (SFSI(this).parent().parent().parent().parent().siblings("li").find("div.sfsi_plus_tool_tip_2").css("z-index", "0"),
                    SFSI(this).parent().parent().parent().parent().siblings("li").find("div.sfsi_plus_wicons").find(".sfsiplus_inerCnt").find("div.sfsi_plus_tool_tip_2").hide()),
                SFSI(this).parent().parent().parent().css("z-index", "1000000"), SFSI(this).parent().parent().css({
                    "z-index": "999"
                }), SFSI(this).attr("data-effect") && "fade_in" == SFSI(this).attr("data-effect") && (SFSI(this).parentsUntil("div").siblings("div.sfsi_plus_tool_tip_2").css({
                    opacity: 1,
                    "z-index": 10
                }), SFSI(this).parent().css("opacity", "1")), SFSI(this).attr("data-effect") && "scale" == SFSI(this).attr("data-effect") && (SFSI(this).parent().addClass("scale"),
                    SFSI(this).parentsUntil("div").siblings("div.sfsi_plus_tool_tip_2").css({
                        opacity: 1,
                        "z-index": 10
                    }), SFSI(this).parent().css("opacity", "1")), SFSI(this).attr("data-effect") && "combo" == SFSI(this).attr("data-effect") && (SFSI(this).parent().addClass("scale"),
                    SFSI(this).parent().css("opacity", "1"), SFSI(this).parentsUntil("div").siblings("div.sfsi_plus_tool_tip_2").css({
                        opacity: 1,
                        "z-index": 10
                    })), ("top-left" == s || "top-right" == s) && SFSI(this).parent().parent().parent().parent("#sfsi_plus_floater").length > 0 && "sfsi_plus_floater" == SFSI(this).parent().parent().parent().parent().attr("id") ? (SFSI(this).parentsUntil("div").siblings("div.sfsi_plus_tool_tip_2").addClass("sfsi_plc_btm"),
                    SFSI(this).parentsUntil("div").siblings("div.sfsi_plus_tool_tip_2").find("span.bot_arow").addClass("top_big_arow"),
                    SFSI(this).parentsUntil("div").siblings("div.sfsi_plus_tool_tip_2").css({
                        opacity: 1,
                        "z-index": 10
                    }), SFSI(this).parentsUntil("div").siblings("div.sfsi_plus_tool_tip_2").show()) : (SFSI(this).parentsUntil("div").siblings("div.sfsi_plus_tool_tip_2").find("span.bot_arow").removeClass("top_big_arow"),
                    SFSI(this).parentsUntil("div").siblings("div.sfsi_plus_tool_tip_2").removeClass("sfsi_plc_btm"),
                    SFSI(this).parentsUntil("div").siblings("div.sfsi_plus_tool_tip_2").css({
                        opacity: 1,
                        "z-index": 10
                    }), SFSI(this).parentsUntil("div").siblings("div.sfsi_plus_tool_tip_2").show());
            if (SFSI(this).parentsUntil("div").siblings("div.sfsi_plus_tool_tip_2").attr('id') == "sfsiplusid_twitter" || SFSI(this).parentsUntil("div").siblings("div.sfsi_plus_tool_tip_2").hasClass("sfsiplusid_twitter")) {
                sfsi_plus_clone = SFSI(this).parentsUntil("div").siblings("div.sfsi_plus_tool_tip_2").find(".sfsi_plus_inside .icon2 iframe").clone();
                SFSI(this).parentsUntil("div").siblings("div.sfsi_plus_tool_tip_2").find(".sfsi_plus_inside .icon2 iframe").detach().remove();
                SFSI(this).parentsUntil("div").siblings("div.sfsi_plus_tool_tip_2").find(".sfsi_plus_inside .icon2").append(sfsi_plus_clone);
            }
        }), SFSI(document).on("mouseleave", "div.sfsi_plus_wicons", function () {
            SFSI(this).children("div.sfsiplus_inerCnt").children("a.sficn").attr("data-effect") && "fade_in" == SFSI(this).children("div.sfsiplus_inerCnt").children("a.sficn").attr("data-effect") && SFSI(this).children("div.sfsiplus_inerCnt").find("a.sficn").css("opacity", "0.6"),
                SFSI(this).children("div.sfsiplus_inerCnt").children("a.sficn").attr("data-effect") && "scale" == SFSI(this).children("div.sfsiplus_inerCnt").children("a.sficn").attr("data-effect") && SFSI(this).children("div.sfsiplus_inerCnt").find("a.sficn").removeClass("scale"),
                SFSI(this).children("div.sfsiplus_inerCnt").children("a.sficn").attr("data-effect") && "combo" == SFSI(this).children("div.sfsiplus_inerCnt").children("a.sficn").attr("data-effect") && (SFSI(this).children("div.sfsiplus_inerCnt").find("a.sficn").css("opacity", "0.6"),
                    SFSI(this).children("div.sfsiplus_inerCnt").find("a.sficn").removeClass("scale"));
                    SFSI(".sfsiplus_inerCnt").find("div.sfsi_plus_tool_tip_2").css("display", "none");
        }), SFSI("body").on("click", function () {
            SFSI(".sfsiplus_inerCnt").find("div.sfsi_plus_tool_tip_2").hide();
        }), SFSI(".adminTooltip >a").on("hover", function () {
            SFSI(this).offset().top, SFSI(this).parent("div").find("div.sfsi_plus_tool_tip_2_inr").css("opacity", "1"),
                SFSI(this).parent("div").find("div.sfsi_plus_tool_tip_2_inr").show();
        }), SFSI(".adminTooltip").on("mouseleave", function () {
            "none" != SFSI(".sfsi_plus_gpls_tool_bdr").css("display") && 0 != SFSI(".sfsi_plus_gpls_tool_bdr").css("opacity") ? SFSI(".pop_up_box ").on("click", function () {
                SFSI(this).parent("div").find("div.sfsi_plus_tool_tip_2_inr").css("opacity", "0"), SFSI(this).parent("div").find("div.sfsi_plus_tool_tip_2_inr").hide();
            }) : (SFSI(this).parent("div").find("div.sfsi_plus_tool_tip_2_inr").css("opacity", "0"),
                SFSI(this).parent("div").find("div.sfsi_plus_tool_tip_2_inr").hide());
        }), SFSI(".expand-area").on("click", function () {
            "Read more" == SFSI(this).text() ? (SFSI(this).siblings("p").children("label").fadeIn("slow"),
                SFSI(this).text("Collapse")) : (SFSI(this).siblings("p").children("label").fadeOut("slow"),
                SFSI(this).text("Read more"));
        }), SFSI(".sfsi_plus_wDiv").length > 0 && setTimeout(function () {
            var s = parseInt(SFSI(".sfsi_plus_wDiv").height()) + 15 + "px";
            SFSI(".sfsi_plus_holders").each(function () {
                SFSI(this).css("height", s);
            });
            SFSI(".sfsi_plus_widget").css("min-height", "auto");
        }, 200);
    jQuery(document).find('.wp-block-ultimate-social-media-plus-sfsi-plus-share-block').each(function (index, target) {
        var actual_target = jQuery(target).find('.sfsi_plus_block');
        var align = jQuery(actual_target).attr('data-align');
        var maxPerRow = jQuery(actual_target).attr('data-count');
        var iconType = jQuery(actual_target).attr('data-icon-type');
        jQuery.ajax({
            'url': '/wp-json/ultimate-social-media-plus/v1/icons/?url=' + encodeURI(decodeURI(window.location.href)) + '&ractangle_icon=' + ('round' == iconType ? 0 : 1),
            'method': 'GET'
            // 'data':{'is_admin':true,'share_url':'/'}
        }).done((response) => {
            jQuery(actual_target).html(response);
            if (iconType == 'round') {
                sfsi_plus_changeIconWidth(maxPerRow, target, align);
            } else {
                if ('center' === align) {
                    jQuery(target).find('.sfsi_plus_block_text_before_icon').css({
                        'display': 'inherit'
                    });
                }
                jQuery(target).css({
                    'text-align': align
                });
            }
            if (window.gapi) {
                window.gapi.plusone.go();
                window.gapi.plus.go();
                window.gapi.ytsubscribe.go();
            };
            if (window.twttr) {
                window.twttr.widgets.load();
            };
            if (window.IN && window.IN.parse) {
                window.IN.parse();
            };
            if (window.addthis) {
                if (window.addthis.toolbox) {
                    window.addthis.toolbox('.addthis_button.sficn');
                } else {
                    window.addthis.init();
                    window.addthis.toolbox('.addthis_button.sficn');
                }
            };
            if (window.PinUtils) {
                window.PinUtils.build();
            };
            if (window.FB) {
                if (window.FB.XFBML) {
                    window.FB.XFBML.parse();
                }
            };
        }).fail((response) => {
            jQuery(actual_target).html(response.responseText.replace('/\\/g', ''));
        });
    });
    if (undefined !== window.location.hash) {
        switch (window.location.hash) {
            case '#ui-id-3':
                jQuery('#ui-id-3').click();
            case '#ui-id-1':
                jQuery('#ui-id-1').click();
        }
    }
    // sfsi_plus_update_iconcount();
});

function sfsi_plus_update_iconcount() {
    SFSI(".wp-block-ultimate-social-media-plus-sfsi-plus-share-block").each(function () {
        var icon_count = SFSI(this).find(".sfsi_plus_block").attr('data-count');
        var icon_align = SFSI(this).find(".sfsi_plus_block").attr('data-align');
        // sfsi_plus_changeIconWidth(icon_count,this);
        if (jQuery(this).find('.sfsiplus_norm_row').length < 1) {
            setTimeout(function () {
                sfsi_plus_changeIconWidth(icon_count, this, icon_align);
            }, 1000);
        } else {
            sfsi_plus_changeIconWidth(icon_count, this, icon_align);
        }
    });
}

function sfsi_plus_changeIconWidth(per_row = null, target, icon_align) {
    var iconWidth = parseInt(jQuery(target).find('.sfsiplus_norm_row div').css('width')) || 40;
    var iconMargin = parseInt(jQuery(target).find('.sfsiplus_norm_row div').css('margin-left')) || 0;

    var wrapperWidth = (iconWidth + iconMargin) * per_row;
    jQuery(target).find('.sfsiplus_norm_row').css({
        'width': wrapperWidth + 'px'
    });
    jQuery(target).find('.sfsi_plus_block').css({
        'width': wrapperWidth + 'px'
    });
    jQuery(target).find('.sfsi_plus_block_text_before_icon').css({
        'padding-top': '12px'
    });
    if ('center' === icon_align) {
        jQuery(target).find('.sfsi_plus_block_text_before_icon').css({
            'display': 'inherit'
        });
    }
    jQuery(target).css({
        'text-align': icon_align
    });
}
//hiding popup on close button
function sfsiplushidemepopup() {
    SFSI(".sfsi_plus_FrntInner").fadeOut();
}

var sfsiplus_initTop = new Array();

function sfsi_plus_wechat_follow(url) {
    if (jQuery('.sfsi_plus_wechat_scan').length == 0) {
        jQuery('body').append("<div class='sfsi_plus_wechat_scan sfsi_plus_overlay show'><div class='sfsi_plus_inner_display'><a class='close_btn' href='' onclick=\"event.preventDefault();close_overlay(\'.sfsi_plus_wechat_scan\')\" >&times;</a><img src='" + url + "' style='max-width:90%;max-height:90%' /></div></div>");
    } else {
        jQuery('.sfsi_plus_wechat_scan').removeClass('hide').addClass('show');
    }
}

function close_overlay(selector) {
    if (typeof selector === "undefined") {
        selector = '.sfsi_plus_overlay';
    }
    jQuery(selector).removeClass('show').addClass('hide');
}

function sfsi_plus_wechat_share(url) {
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        sfsi_plus_wechat_share_mobile(url);
    } else {
        if (jQuery('.sfsi_plus_wechat_follow_overlay').length == 0) {
            jQuery('body').append("<div class='sfsi_plus_wechat_follow_overlay sfsi_plus_overlay show'><div class='sfsi_plus_inner_display'><a class='close_btn' href='' onclick=\"event.preventDefault();close_overlay(\'.sfsi_plus_wechat_follow_overlay\')\" >&times;</a><div style='width:95%;max-width:500px; min-height:80%;background-color:#fff;margin:0 auto;margin:10% auto;padding: 20px 0;'><div style='width:90%;margin: 0 auto;text-align:center'><div class='sfsi_plus_wechat_qr_display' style='display:inline-block'></div></div><div style='width:80%;margin:10px auto 0 auto;text-align:center;font-weight:900;font-size:25px;'>\"Scan QR Code\" in WeChat and press ··· to share!</div></div></div>");
            new QRCode(jQuery('.sfsi_plus_wechat_follow_overlay .sfsi_plus_wechat_qr_display')[0], encodeURI(decodeURI(window.location.href)))
            jQuery('.sfsi_plus_wechat_follow_overlay .sfsi_plus_wechat_qr_display img').attr('nopin', 'nopin')
        } else {
            jQuery('.sfsi_plus_wechat_follow_overlay').removeClass('hide').addClass('show');
        }
    }
}

function sfsi_plus_wechat_share_mobile(url) {
    if (jQuery('.sfsi_plus_wechat_follow_overlay').length == 0) {
        jQuery('body').append("<div class='sfsi_plus_wechat_follow_overlay sfsi_plus_overlay show'><div class='sfsi_plus_inner_display'><a class='close_btn'  href='' onclick=\"event.preventDefault();close_overlay(\'.sfsi_plus_wechat_follow_overlay\')\" >&times;</a><div style='width:95%; min-height:80%;background-color:#fff;margin:0 auto;margin:20% auto;padding: 20px 0;'><div style='width:90%;margin: 0 auto;'><input type='text' value='" + encodeURI(decodeURI(window.location.href)) + "' style='width:100%;padding:7px 0;text-align:center' /></div><div style='width:80%;margin:10px auto 0 auto'><div style='width:30%;display:inline-block;text-align:center' class='sfsi_plus_upload_butt_container' ><button onclick='sfsi_copy_text_parent_input(event)' class='upload_butt' >Copy</button></div><div style='width:60%;display:inline-block;text-align:center;margin-left:10%' class='sfsi_plus_upload_butt_container' ><a href='weixin://' class='upload_butt'>Open WeChat</a></div></div></div></div>");
    } else {
        jQuery('.sfsi_plus_wechat_follow_overlay').removeClass('hide').addClass('show');
    }
}

function sfsi_copy_text_parent_input(event) {
    var target = jQuery(event.target);
    input_target = target.parent().parent().parent().find('input');
    input_target.select();
    document.execCommand('copy');
}


function sfsi_plus_widget_set() {
    jQuery(".sfsi_plus_widget").each(function (index) {
        if (jQuery(this).attr("data-position") == "widget") {
            var wdgt_hght = jQuery(this).children(".sfsiplus_norm_row.sfsi_plus_wDiv").height();
            var title_hght = jQuery(this).parent(".widget.sfsi_plus").children(".widget-title").height();
            var totl_hght = parseInt(title_hght) + parseInt(wdgt_hght);
            jQuery(this).parent(".widget.sfsi_plus").css("min-height", totl_hght + "px");
        }
    });
}

function sfsi_plus_time_pop_up(time_popUp){
    jQuery(document).ready(function($) {
		setTimeout(
			function() {
				jQuery('.sfsi_plus_outr_div').css({
					'z-index': '1000000',
					opacity: 1
				});
				jQuery('.sfsi_plus_outr_div').fadeIn();
				jQuery('.sfsi_plus_FrntInner').fadeIn(200);
			}, time_popUp);
	});
}
function sfsi_plus_responsive_toggle(){
    jQuery(document).scroll(function($) {
        var y = jQuery(this).scrollTop();
        if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
            if (jQuery(window).scrollTop() + jQuery(window).height() >= jQuery(document).height() - 100) {
                jQuery('.sfsi_plus_outr_div').css({
                    'z-index': '9996',
                    opacity: 1,
                    top: jQuery(window).scrollTop() + "px",
                    position: "absolute"
                });
                jQuery('.sfsi_plus_outr_div').fadeIn(200);
                jQuery('.sfsi_plus_FrntInner').fadeIn(200);
            } else {
                jQuery('.sfsi_plus_outr_div').fadeOut();
                jQuery('.sfsi_plus_FrntInner').fadeOut();
            }
        } else {
            if (jQuery(window).scrollTop() + jQuery(window).height() >= jQuery(document).height() - 3) {
                jQuery('.sfsi_plus_outr_div').css({
                    'z-index': '9996',
                    opacity: 1,
                    top: jQuery(window).scrollTop() + 200 + "px",
                    position: "absolute"
                });
                jQuery('.sfsi_plus_outr_div').fadeIn(200);
                jQuery('.sfsi_plus_FrntInner').fadeIn(200);
            } else {
                jQuery('.sfsi_plus_outr_div').fadeOut();
                jQuery('.sfsi_plus_FrntInner').fadeOut();
            }
        }
    });
}

function sfsi_social_pop_up(time_popUp){
    jQuery(document).ready(function($) {
        //SFSI('.sfsi_plus_outr_div').fadeIn();
        sfsi_plus_setCookie('sfsi_socialPopUp', time(), 32);
        setTimeout(function() {
            jQuery('.sfsi_plus_outr_div').css({
                'z-index': '1000000',
                opacity: 1
            });
            jQuery('.sfsi_plus_outr_div').fadeIn();
        }, time_popUp);
    });
    var SFSI = jQuery.noConflict();
}

// should execute at last so that every function is acceable.
var sfsi_plus_functions_loaded =  new CustomEvent('sfsi_plus_functions_loaded',{detail:{"abc":"def"}});
window.dispatchEvent(sfsi_plus_functions_loaded);


function sfsi_plus_pinterest_modal_images(event,url,title) {
    // console.log(event);
    event && event.preventDefault();
  var imgSrc = [];
  var page_title;

  page_title = SFSI('meta[property="og:title"]').attr('content');
  if(undefined == page_title){
    page_title = SFSI('head title').text();
  }
  if(undefined == title){
    title = page_title;
  }
  if(undefined == url){
    url = window.location.href;
    // url = encodeURIComponent(window.location.href);
  }
  SFSI('body img').each(function (index) {
    var src = SFSI(this).attr('src') || "";
    var height = SFSI(this).height();
    var width = SFSI(this).width();
    var image_title = SFSI(this).attr('title') || "";
    var alt = SFSI(this).attr('alt') || "";
    var no_pin = SFSI(this).attr('data-pin-nopin') || "";
    var no_pin_old = SFSI(this).attr('nopin') || "";

    if (src !== "" && !src.startsWith("javascript") && height > 100 && width > 100 && no_pin_old !== "nopin" && no_pin !== "true") {
      imgSrc.push({
        src: src,
        title: title && "" !== title ? title : (image_title && "" !== image_title ? image_title : alt)
      });
    }
  });

  sfsi_plus_pinterest_modal();
  console.log(imgSrc);
  if(imgSrc.length==0){
    var meta_img = SFSI('meta[property="og:image"]').attr('content');
    if(undefined == meta_img){
        meta_img ="";
    }
    SFSI('.sfsi_plus_flex_container').append('<div><a href="https://www.pinterest.com/pin/create/button/?url=' + url + '&media=&description=' + encodeURIComponent(page_title).replace('+', '%20').replace("#", "%23") + '"><div style="width:140px;height:90px;display:inline-block;" ></div><span class="sfsi_plus_pinterest_overlay"><img data-pin-nopin="true" height="30" width="30" src="' + window.sfsi_plus_ajax_object.plugin_url + '/images/pinterest.png" /></span></a></div>')
  }else{

      // console.log(imgSrc);
      SFSI.each(imgSrc, function (index, val) {
          // console.log('discrip',val);
          SFSI('.sfsi_plus_flex_container').append('<div><a href="https://www.pinterest.com/pin/create/button/?url=' + url + '&media=' + val.src + '&description=' + encodeURIComponent(val.title ? val.title : page_title).replace('+', '%20').replace("#", "%23") + '"><img style="display:inline"  data-pin-nopin="true" src="' + val.src + '"><span class="sfsi_plus_pinterest_overlay" style="width:140px;left:unset;"><img data-pin-nopin="true" height="30" width="30" style="display:inline" src="' + window.sfsi_plus_ajax_object.plugin_url + '/images/pinterest.png" /></span></a></div>');
      });
    }
    event.preventDefault();

}

function sfsi_plus_pinterest_modal(imgs) {
    console.log();
  // if (jQuery('.sfsi_premium_wechat_follow_overlay').length == 0) {
  jQuery('body').append(
    "<div class='sfsi_plus_wechat_follow_overlay sfsi_overlay show'>" +
    "<div class='sfsi_plus_inner_display'>" +
    '<a class="close_btn" href="" onclick="event.preventDefault();close_overlay(\'.sfsi_plus_wechat_follow_overlay\')" >×</a>' +
    "<div style='width:95%;max-width:500px; min-height:80%;background-color:#fff;margin:0 auto;margin:10% auto;padding: 20px 0;border-radius: 20px;'>" +
    "<h4 style='margin-left:10px;'>Pin It on Pinterest</h4>" +
    "<div class='sfsi_plus_flex_container'>" +

    "</div>" +
    "</div>" +
    "</div>" +
    "</div>"
  );
};

}
catch(e){console.error("An error has occurred: "+e.stack);}
/* https://kathigitis-aepp.gr/wp-content/plugins/wpcf7-redirect/js/wpcf7-redirect-script.js */
try{
jQuery(document).ready(function() {
    wpcf7_redirect_mailsent_handler();
});

function wpcf7_redirect_mailsent_handler() {
	document.addEventListener( 'wpcf7mailsent', function( event ) {
		form = wpcf7_redirect_forms [ event.detail.contactFormId ];

		// Script to run after sent.
		if ( form.after_sent_script ) {
			form.after_sent_script = htmlspecialchars_decode( form.after_sent_script );
			eval( form.after_sent_script );
		}

		// Set redirect URL
		if ( form.use_external_url && form.external_url ) {
			redirect_url = form.external_url;
		} else {
			redirect_url = form.thankyou_page_url;
		}

		// Build http query
		if ( form.http_build_query ) {
			temp_http_query 	 = jQuery.param( event.detail.inputs, true );
			http_query = temp_http_query.replace(new RegExp('\\+', 'g'), '%20');
			redirect_url = redirect_url + '?' + decodeURIComponent(http_query);
		} else if ( form.http_build_query_selectively ) {
			http_query = '?';
			selective_fields = form.http_build_query_selectively_fields.split(' ').join('');
			event.detail.inputs.forEach( function(element, index) {
				if ( selective_fields.indexOf( element.name ) != -1 ) {
					http_query += element.name + '=' + element.value + '&';
				}
			});

			http_query = http_query.slice(0, -1);
			redirect_url = redirect_url + decodeURIComponent(http_query);
		} 

		// Redirect
		if ( redirect_url ) {
			if ( ! form.open_in_new_tab ) {
				// Open in current tab
				if ( form.delay_redirect ) {
					setTimeout(function() {
						location.href = redirect_url;
					}, form.delay_redirect);
				} else {
					location.href = redirect_url;
				}
			} else {
				// Open in external tab
				if ( form.delay_redirect ) {
					setTimeout(function() {
						window.open( redirect_url );
					}, form.delay_redirect);
				} else {
					window.open( redirect_url );
				}
			}
		}

	}, false );
}

function htmlspecialchars_decode( string ) {
	var map = {
        '&amp;': '&',
        '&#038;': "&",
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&#039;': "'",
        '&#8217;': "’",
        '&#8216;': "‘",
        '&#8211;': "–",
        '&#8212;': "—",
        '&#8230;': "…",
        '&#8221;': '”'
    };

    return string.replace(/\&[\w\d\#]{2,5}\;/g, function(m) { return map[m]; });
};

}
catch(e){console.error("An error has occurred: "+e.stack);}
/* https://kathigitis-aepp.gr/wp-content/plugins/popups/public/assets/js/public.js */
try{
/*!
 * imagesLoaded PACKAGED v3.1.8
 * JavaScript is all like "You images are done yet or what?"
 * MIT License
 */
(function(){function e(){}function t(e,t){for(var n=e.length;n--;)if(e[n].listener===t)return n;return-1}function n(e){return function(){return this[e].apply(this,arguments)}}var i=e.prototype,r=this,o=r.EventEmitter;i.getListeners=function(e){var t,n,i=this._getEvents();if("object"==typeof e){t={};for(n in i)i.hasOwnProperty(n)&&e.test(n)&&(t[n]=i[n])}else t=i[e]||(i[e]=[]);return t},i.flattenListeners=function(e){var t,n=[];for(t=0;e.length>t;t+=1)n.push(e[t].listener);return n},i.getListenersAsObject=function(e){var t,n=this.getListeners(e);return n instanceof Array&&(t={},t[e]=n),t||n},i.addListener=function(e,n){var i,r=this.getListenersAsObject(e),o="object"==typeof n;for(i in r)r.hasOwnProperty(i)&&-1===t(r[i],n)&&r[i].push(o?n:{listener:n,once:!1});return this},i.on=n("addListener"),i.addOnceListener=function(e,t){return this.addListener(e,{listener:t,once:!0})},i.once=n("addOnceListener"),i.defineEvent=function(e){return this.getListeners(e),this},i.defineEvents=function(e){for(var t=0;e.length>t;t+=1)this.defineEvent(e[t]);return this},i.removeListener=function(e,n){var i,r,o=this.getListenersAsObject(e);for(r in o)o.hasOwnProperty(r)&&(i=t(o[r],n),-1!==i&&o[r].splice(i,1));return this},i.off=n("removeListener"),i.addListeners=function(e,t){return this.manipulateListeners(!1,e,t)},i.removeListeners=function(e,t){return this.manipulateListeners(!0,e,t)},i.manipulateListeners=function(e,t,n){var i,r,o=e?this.removeListener:this.addListener,s=e?this.removeListeners:this.addListeners;if("object"!=typeof t||t instanceof RegExp)for(i=n.length;i--;)o.call(this,t,n[i]);else for(i in t)t.hasOwnProperty(i)&&(r=t[i])&&("function"==typeof r?o.call(this,i,r):s.call(this,i,r));return this},i.removeEvent=function(e){var t,n=typeof e,i=this._getEvents();if("string"===n)delete i[e];else if("object"===n)for(t in i)i.hasOwnProperty(t)&&e.test(t)&&delete i[t];else delete this._events;return this},i.removeAllListeners=n("removeEvent"),i.emitEvent=function(e,t){var n,i,r,o,s=this.getListenersAsObject(e);for(r in s)if(s.hasOwnProperty(r))for(i=s[r].length;i--;)n=s[r][i],n.once===!0&&this.removeListener(e,n.listener),o=n.listener.apply(this,t||[]),o===this._getOnceReturnValue()&&this.removeListener(e,n.listener);return this},i.trigger=n("emitEvent"),i.emit=function(e){var t=Array.prototype.slice.call(arguments,1);return this.emitEvent(e,t)},i.setOnceReturnValue=function(e){return this._onceReturnValue=e,this},i._getOnceReturnValue=function(){return this.hasOwnProperty("_onceReturnValue")?this._onceReturnValue:!0},i._getEvents=function(){return this._events||(this._events={})},e.noConflict=function(){return r.EventEmitter=o,e},"function"==typeof define&&define.amd?define("eventEmitter/EventEmitter",[],function(){return e}):"object"==typeof module&&module.exports?module.exports=e:this.EventEmitter=e}).call(this),function(e){function t(t){var n=e.event;return n.target=n.target||n.srcElement||t,n}var n=document.documentElement,i=function(){};n.addEventListener?i=function(e,t,n){e.addEventListener(t,n,!1)}:n.attachEvent&&(i=function(e,n,i){e[n+i]=i.handleEvent?function(){var n=t(e);i.handleEvent.call(i,n)}:function(){var n=t(e);i.call(e,n)},e.attachEvent("on"+n,e[n+i])});var r=function(){};n.removeEventListener?r=function(e,t,n){e.removeEventListener(t,n,!1)}:n.detachEvent&&(r=function(e,t,n){e.detachEvent("on"+t,e[t+n]);try{delete e[t+n]}catch(i){e[t+n]=void 0}});var o={bind:i,unbind:r};"function"==typeof define&&define.amd?define("eventie/eventie",o):e.eventie=o}(this),function(e,t){"function"==typeof define&&define.amd?define(["eventEmitter/EventEmitter","eventie/eventie"],function(n,i){return t(e,n,i)}):"object"==typeof exports?module.exports=t(e,require("wolfy87-eventemitter"),require("eventie")):e.imagesLoaded=t(e,e.EventEmitter,e.eventie)}(window,function(e,t,n){function i(e,t){for(var n in t)e[n]=t[n];return e}function r(e){return"[object Array]"===d.call(e)}function o(e){var t=[];if(r(e))t=e;else if("number"==typeof e.length)for(var n=0,i=e.length;i>n;n++)t.push(e[n]);else t.push(e);return t}function s(e,t,n){if(!(this instanceof s))return new s(e,t);"string"==typeof e&&(e=document.querySelectorAll(e)),this.elements=o(e),this.options=i({},this.options),"function"==typeof t?n=t:i(this.options,t),n&&this.on("always",n),this.getImages(),a&&(this.jqDeferred=new a.Deferred);var r=this;setTimeout(function(){r.check()})}function f(e){this.img=e}function c(e){this.src=e,v[e]=this}var a=e.jQuery,u=e.console,h=u!==void 0,d=Object.prototype.toString;s.prototype=new t,s.prototype.options={},s.prototype.getImages=function(){this.images=[];for(var e=0,t=this.elements.length;t>e;e++){var n=this.elements[e];"IMG"===n.nodeName&&this.addImage(n);var i=n.nodeType;if(i&&(1===i||9===i||11===i))for(var r=n.querySelectorAll("img"),o=0,s=r.length;s>o;o++){var f=r[o];this.addImage(f)}}},s.prototype.addImage=function(e){var t=new f(e);this.images.push(t)},s.prototype.check=function(){function e(e,r){return t.options.debug&&h&&u.log("confirm",e,r),t.progress(e),n++,n===i&&t.complete(),!0}var t=this,n=0,i=this.images.length;if(this.hasAnyBroken=!1,!i)return this.complete(),void 0;for(var r=0;i>r;r++){var o=this.images[r];o.on("confirm",e),o.check()}},s.prototype.progress=function(e){this.hasAnyBroken=this.hasAnyBroken||!e.isLoaded;var t=this;setTimeout(function(){t.emit("progress",t,e),t.jqDeferred&&t.jqDeferred.notify&&t.jqDeferred.notify(t,e)})},s.prototype.complete=function(){var e=this.hasAnyBroken?"fail":"done";this.isComplete=!0;var t=this;setTimeout(function(){if(t.emit(e,t),t.emit("always",t),t.jqDeferred){var n=t.hasAnyBroken?"reject":"resolve";t.jqDeferred[n](t)}})},a&&(a.fn.imagesLoaded=function(e,t){var n=new s(this,e,t);return n.jqDeferred.promise(a(this))}),f.prototype=new t,f.prototype.check=function(){var e=v[this.img.src]||new c(this.img.src);if(e.isConfirmed)return this.confirm(e.isLoaded,"cached was confirmed"),void 0;if(this.img.complete&&void 0!==this.img.naturalWidth)return this.confirm(0!==this.img.naturalWidth,"naturalWidth"),void 0;var t=this;e.on("confirm",function(e,n){return t.confirm(e.isLoaded,n),!0}),e.check()},f.prototype.confirm=function(e,t){this.isLoaded=e,this.emit("confirm",this,t)};var v={};return c.prototype=new t,c.prototype.check=function(){if(!this.isChecked){var e=new Image;n.bind(e,"load",this),n.bind(e,"error",this),e.src=this.src,this.isChecked=!0}},c.prototype.handleEvent=function(e){var t="on"+e.type;this[t]&&this[t](e)},c.prototype.onload=function(e){this.confirm(!0,"onload"),this.unbindProxyEvents(e)},c.prototype.onerror=function(e){this.confirm(!1,"onerror"),this.unbindProxyEvents(e)},c.prototype.confirm=function(e,t){this.isConfirmed=!0,this.isLoaded=e,this.emit("confirm",this,t)},c.prototype.unbindProxyEvents=function(e){n.unbind(e.target,"load",this),n.unbind(e.target,"error",this)},s});

(function($){
	"use strict";

var SPU_master = function() {

	var windowHeight 	= $(window).height();
	var isAdmin 		= spuvar.is_admin;
	var isPreview		= spuvar.is_preview;
	var $boxes 			= [];

	//remove paddings and margins from first and last items inside box
	$(".spu-content").children().first().css({
		"margin-top": 0,
		"padding-top": 0
	}).end().last().css({
		'margin-bottom': 0,
		'padding-bottom': 0
	});

	// loop through boxes
	$(".spu-box").each(function() {

		// vars
		var $box 			= $(this);

		// move to parent in top bar mode
		if( $box.hasClass('spu-top-bar') || $box.hasClass('spu-bottom-bar') ){

			$box.prependTo('body');
			if( $box.hasClass('spu-top-bar') && $('#wpadminbar').length )
				$box.css( 'top', '32px');
		}

		var triggerMethod 	= $box.data('trigger');
		var timer 			= 0;
		var testMode 		= (parseInt($box.data('test-mode')) === 1);
		var id 				= $box.data('box-id');
		var autoHide 		= (parseInt($box.data('auto-hide')) === 1);
		var secondsClose    = parseInt($box.data('seconds-close'));
		var triggerSeconds 	= parseInt( $box.data('trigger-number'), 10 );
		var triggerPercentage = ( triggerMethod == 'percentage' ) ? ( parseInt( $box.data('trigger-number'), 10 ) / 100 ) : 0.8;
		var triggerHeight 	= ( triggerPercentage * $(document).height() );

		facebookFix( $box );
		
		// search for youtube, vimeo videos
        var iframe = $box.find('iframe');
        if( iframe && iframe.length) {
        	iframe.each(function () {
				$(this).attr('spusrc',$(this).attr('src'));
				$(this).attr('src','https://#');
            })
		}
        // Custom links conversion
        $box.on('click', 'a:not(".spu-close-popup, .flp_wrapper a, .spu-not-close, .spu-not-close a")', function(){
            // hide the popup and track conversion
            toggleBox( id, false, true);
        });
        // Close and convert button
        $box.on('click', '.spu-close-convert,.spu-close-convert a', function(e){
        	e.preventDefault();
            // hide the popup and track conversion
            toggleBox( id, false, true);
        });
		//close with esc
		$(document).keyup(function(e) {
			if (e.keyCode == 27) {
				toggleBox( id, false, false );
			}
		});
		//close on ipads // iphones
		var ua = navigator.userAgent,
		event = (ua.match(/iPad/i) || ua.match(/iPhone/i)) ? "touchstart" : "click";


		$('body').on(event, function (ev) {
			var $target = $(ev.target);
			// for some reason ninja form in ajax mode not working, added this dirty workadound
			// $.contains( $box, $target ) return false , same for .has .parents, etc
			// so no popup closing when form is clicked
			if($target.is('input.nf-element')) {
                return;
            }

			// test that event is user triggered and not programatically,
			// and that it is not fired from input within the box
			if( ev.originalEvent !== undefined && ! ( $.contains( $box, $target ) && $target.is('input') ) && ! $box.hasClass('spu-top-bar') && ! $box.hasClass('spu-bottom-bar') ) {
				toggleBox( id, false, false );
			}
		});
		//not on the box
        $('body' ).on(event,'.spu-box,.spu-clickable', function(event) {
            event.stopPropagation();
        });
		//hide boxes and remove left-99999px we cannot since beggining of facebook won't display
		$box.hide().css('left','').css('right','');

		// add box to global boxes array
		$boxes[id] = $box;

		// functions that check % of height
		var triggerHeightCheck = function()
		{
			if(timer) {
				clearTimeout(timer);
			}

			timer = window.setTimeout(function() {
				var scrollY = $(window).scrollTop();
				var triggered = ((scrollY + windowHeight) >= triggerHeight);

				// show box when criteria for this box is matched
				if( triggered ) {

					// remove listen event if box shouldn't be hidden again
					if( ! autoHide ) {
						$(window).unbind('scroll', triggerHeightCheck);
					}

					toggleBox( id, true, false );
				} else {
					toggleBox( id, false, false );
				}

			}, 100);
		}

		// functions that check pixels of height
		var triggerPixelsCheck = function()
		{
			if(timer) {
				clearTimeout(timer);
			}

			timer = window.setTimeout(function() {
				var scrollY = $(window).scrollTop();
				var triggered = ( scrollY  >= triggerSeconds);//triggerSeconds equals to the number field really

				// show box when criteria for this box is matched
				if( triggered ) {

					// remove listen event if box shouldn't be hidden again
					if( ! autoHide ) {
						$(window).unbind('scroll', triggerPixelsCheck);
					}

					toggleBox( id, true, false );
				} else {
					toggleBox( id, false, false );
				}

			}, 100);
		}
		// function that show popup after X secs
		var triggerSecondsCheck = function()
		{
			if(timer) {
				clearTimeout(timer);
			}

			timer = window.setTimeout(function() {

				toggleBox( id, true, false );

			}, triggerSeconds * 1000);
		}

		// show box if cookie not set or if in test mode
		//var cookieValue = spuReadCookie( 'spu_box_' + id );

		var nclose_cookie = $box.data('nclose-cookie');
		var nconvert_cookie = $box.data('nconvert-cookie');

		var cookieValue1 = spuReadCookie( nclose_cookie );
		var cookieValue2 = spuReadCookie( nconvert_cookie );

		if( (
				( cookieValue1 == undefined || cookieValue1 == '' ) &&
				( cookieValue2 == undefined || cookieValue2 == '' )
			) || ( isAdmin && testMode ) || isPreview ) {

			if(triggerMethod == 'seconds') {
				triggerSecondsCheck();
			}
			if(triggerMethod == 'percentage'){
				$(window).bind( 'scroll', triggerHeightCheck );
				// init, check box criteria once
				triggerHeightCheck();
			}
			if(triggerMethod == 'pixels'){
				$(window).bind( 'scroll', triggerPixelsCheck );
				// init, check box criteria once
				triggerPixelsCheck();
			}

			// shows the box when hash refers to a box
			if(window.location.hash && window.location.hash.length > 0) {

				var hash = window.location.hash;
				var $element;

				if( hash.substring(1) === $box.attr( 'id' ) ) {
					setTimeout(function() {
						toggleBox( id, true, false );
					}, 100);
				}
			}
		}	/* end check cookie */
		//close popup
		$box.on('click','.spu-close-popup',function() {

			// hide box
			toggleBox( id, false, false );

			if(triggerMethod == 'percentage') {
				// unbind
				$(window).unbind( 'scroll', triggerHeightCheck );
			}

		});

		// add link listener for this box
		$(document.body).on('click','a[href="#spu-' + id +'"], .spu-open-' + id ,function(e) {
			e.preventDefault();
			toggleBox(id, true, false);
		});
		$('a[href="#spu-' + id +'"], .spu-open-' + id).css('cursor','pointer').addClass('spu-clickable');

		// add class to the gravity form if they exist within the box
		$box.find('.gform_wrapper form').addClass('gravity-form');
		// same for mc4wp
		$box.find('.mc4wp-form form').addClass('mc4wp-form');
		// same for newsletter plugin
		$box.find('.newsletter form').addClass('newsletter-form');

		// check if we have forms and perform different actions
		var box_form = $box.find('form');
		if( box_form.length ) {
			// Only if form is not a known one disable ajax
			if( ! box_form.is(".newsletter-form, .wpcf7-form, .gravity-form, .infusion-form, .widget_wysija, .ninja-forms-form") ) {
				var action = box_form.attr('action'),
					pattern = new RegExp(spuvar.site_url, "i");
				if (action && action.length) {
					if (!pattern.test(action))
						box_form.addClass('spu-disable-ajax');
				}
			}
			// if spu-disable-ajax is on container add it to form (usp forms for example)
			if( $('.spu-disable-ajax form').length ) {
				$('.spu-disable-ajax form').addClass('spu-disable-ajax');
			}
			// Disable ajax on form by adding .spu-disable-ajax class to it
			$box.on('submit','form.spu-disable-ajax:not(".flp_form")', function(){

				$box.trigger('spu.form_submitted', [id]);
				toggleBox(id, false, true );
			});

			// Add generic form tracking
			$box.on('submit','form:not(".newsletter-form, .wpcf7-form, .gravity-form, .infusion-form, .spu-disable-ajax, .widget_wysija, .ninja-forms-form, .flp_form")', function(e){
				e.preventDefault();

				var submit 	= true,
					form 		= $(this),
					button 		= form.find('input[type="submit"]'),
					tail		= button ? button.attr('name')+'='+button.val() : 'button=send',
					data 	 	= form.serialize()+"&"+tail,
					referer 	= form.find('input[name="_wp_http_referer"]'),
					urlref		= referer && referer.val() !== undefined ? spuvar.site_url+referer.val() : window.location.href,
					action 		= form.attr('action') ? form.attr('action') : urlref,
					url  	 	= form.hasClass('mc4wp-form') ? spuvar.site_url +'/' : action,
					error_cb 	= function (data, error, errorThrown){
						console.log('Spu Form error: ' + error + ' - ' + errorThrown);
						//console.log(data);
					},
					success_cb 	= function (data){

						var response = $(data).filter('#spu-'+ id ).html();
						$('#spu-' + id ).html(response);

						// check if an error was returned for m4wp
						if( ! $('#spu-' + id ).find('.mc4wp-alert').length ) {

							// give 2 seconds for response
							setTimeout( function(){

								toggleBox(id, false, true );

							}, spuvar.seconds_confirmation_close * 1000);

						} 
					};

				// Send form by ajax and replace popup with response
				request(data, url, success_cb, error_cb, 'html');

				$box.trigger('spu.form_submitted', [id]);

				return submit;
			});

			// CF7 support
			$(document).on('wpcf7mailsent', function(){
				$box.trigger('spu.form_submitted', [id]);
				toggleBox(id, false, true );
			});

			// Gravity forms support (only AJAX mode)
			if( box_form.hasClass('gravity-form') ) {
				box_form.attr('action', window.location.href)
			}
			$(document).on('gform_confirmation_loaded', function(){
				$box.trigger('spu.form_submitted', [id]);
				toggleBox(id, false, true );
			});

			// Infusion Software - not ajax
			$box.on('submit','.infusion-form', function(e){
				e.preventDefault();
				$box.trigger('spu.form_submitted', [id]);
				toggleBox(id, false, true );
				this.submit();
			});
			// The newsletter plugin - not ajax
			$box.on('submit','.newsletter-form', function(e){
				e.preventDefault();
				$box.trigger('spu.form_submitted', [id]);
				toggleBox(id, false, true );
				this.submit();
			});
			// Ninja form - popup not ajax, ajax on ninja form
			$('body').on('submitResponse.default', function(){
				$box.trigger('spu.form_submitted', [id]);
				toggleBox(id, false, true );
			});
		}

		// Ninja Forms 3 does not use a form element
		var box_nf3 = $box.find('.nf-form-cont');
		if ( box_nf3.length ) {
			$(document).on('nfFormSubmitResponse', function(){
				$box.trigger('spu.form_submitted', [id]);

				// delay box close so user sees submission feedback
				// should this delay be a config option?
				setTimeout( function(){
					toggleBox(id, false, true );
				}, spuvar.seconds_confirmation_close * 1000);
			});
		}

	});



	//function that center popup on screen
	function fixSize( id ) {
		var $box 			= $boxes[id];
		var windowWidth 	= $(window).width();
		var windowHeight 	= $(window).height();
		var popupHeight 	= $box.outerHeight();
		var popupWidth 		= $box.outerWidth();
		var intentWidth		= $box.data('width');
		var left 			= 0;
		var top 			= windowHeight / 2 - popupHeight / 2;
		var position 		= 'fixed';
		var currentScroll   = $(document).scrollTop();

		if( $box.hasClass('spu-centered') ){
			if( intentWidth < windowWidth ) {
				left = windowWidth / 2 - popupWidth / 2;
			}
			$box.css({
				"left": 	left,
				"position": position,
				"top": 		top,
			});
		}

		// if popup is higher than viewport we need to make it absolute
		if( (popupHeight + 50) > windowHeight ) {
			position 	= 'absolute';
			top 		= currentScroll;

			$box.css({
				"position": position,
				"top": 		top,
				"bottom": 	"auto",
				//"right": 	"auto",
				//"left": 	"auto",
			});
		}

	}

	//facebookBugFix
	function facebookFix( box ) {

		// Facebook bug that fails to resize
		var $fbbox = $(box).find('.spu-facebook');
		if( $fbbox.length ){
			//if exist and width is 0
			var $fbwidth = $fbbox.find('.fb-like > span').width();
			if ( $fbwidth == 0 ) {
				var $fblayout = $fbbox.find('.fb-like').data('layout');
				 if( $fblayout == 'box_count' ) {

					$fbbox.append('<style type="text/css"> #'+$(box).attr('id')+' .fb-like iframe, #'+$(box).attr('id')+' .fb_iframe_widget span, #'+$(box).attr('id')+' .fb_iframe_widget{ height: 63px !important;width: 80px !important;}</style>');

				 } else if( $fblayout == 'button_count' ) {

					$fbbox.append('<style type="text/css"> #'+$(box).attr('id')+' .fb-like iframe, #'+$(box).attr('id')+' .fb_iframe_widget span, #'+$(box).attr('id')+' .fb_iframe_widget{ height: 20px !important;min-width: 120px !important;}</style>');

				 } else {

					$fbbox.append('<style type="text/css"> #'+$(box).attr('id')+' .fb-like iframe, #'+$(box).attr('id')+' .fb_iframe_widget span, #'+$(box).attr('id')+' .fb_iframe_widget{ height: 20px !important;width: 80px !important;}</style>');

				 }
			}
		}
	}

	/**
	 * Check all shortcodes and automatically center them
	 * @param box
	 */
	function centerShortcodes( box ){
		var $box 	= box;
		var total = $box.data('total'); //total of shortcodes used
		if( total ) { //if we have shortcodes
			//SPU_reload_socials(); //remove 20180515

			//wrap them all
			//center spu-shortcodes
			var swidth = 0;
			var free_width = 0;
			var boxwidth = $box.outerWidth();
			var cwidth = $box.find(".spu-content").width();
			if (!spuvar.disable_style && $(window).width() > boxwidth) {
				$box.find(".spu-shortcode").wrapAll('<div class="spu_shortcodes"/>');
				//calculate total width of shortcodes all togheter
				$box.find(".spu-shortcode").each(function () {
					swidth = swidth + $(this).outerWidth();
				});
				//available space to split margins
				free_width = cwidth - swidth - (total*20);

			}
			if (free_width > 0) {
				//leave some margin
				$box.find(".spu-shortcode").each(function () {

					$(this).css('margin-left', (free_width / 2 ));

				});
				//remove margin when neccesary
				if (total == 2) {

					$box.find(".spu-shortcode").last().css('margin-left', 0);

				} else if (total == 3) {

					$box.find(".spu-shortcode").first().css('margin-left', 0);

				}
			}
		}
	}
	/**
	 * Main function to show or hide the popup
	 * @param id int box id
	 * @param show boolean it's hiding or showing?
	 * @param conversion boolean - Its a conversion or we are just closing
	 * @returns {*}
	 */
	function toggleBox( id, show, conversion ) {
		var $box 	= $boxes[id];
		var $bg	 	= $('#spu-bg-'+id);
		var $bgopa 	= $box.data('bgopa');

		// don't do anything if box is undergoing an animation
		if( $box.is( ":animated" ) ) {
			return false;
		}

		// is box already at desired visibility?
		if( ( show === true && $box.is( ":visible" ) ) || ( show === false && $box.is( ":hidden" ) ) ) {
			return false;
		}

		//if we are closing , set cookie
		if( show === false) {
			// set cookie
			var tcookie = $box.data('tclose-cookie');
			var dcookie = parseFloat( $box.data('dclose-cookie') );
			var ncookie = $box.data('nclose-cookie');
			
			if( conversion === true ) {
				tcookie = $box.data('tconvert-cookie');
				dcookie = parseFloat( $box.data('dconvert-cookie') );
				ncookie = $box.data('nconvert-cookie');
			}
			
			if( dcookie > 0 ) {
				spuCreateCookie( ncookie, true, tcookie, dcookie );
			}
			$box.trigger('spu.box_close', [id]);
			// check for videos inside and destroy it
            var iframe = $box.find('iframe[src*="vimeo"],iframe[src*="youtube"],iframe[src*="youtu.be"]');
			if( iframe && iframe.length ){
				iframe.each(function () {
					$(this).attr('src','https://#');
                });
			}
		} else {
			setTimeout(function(){
				centerShortcodes($box);
			},1500);
			$box.trigger('spu.box_open', [id]);
			//bind for resize
			$(window).resize(function(){

				fixSize( id );

			});
			fixSize( id );
            var iframe = $box.find('iframe');
            if( iframe && iframe.length ){
                iframe.each(function () {
                	if( $(this).attr('spusrc') )
                    	$(this).attr('src',$(this).attr('spusrc'));
                });
            }

		}

		// show box
		var animation = $box.data('spuanimation'),
			conversion_close = $box.data('close-on-conversion');


		if (animation === 'fade') {
			if (show === true) {
				$box.fadeIn('slow');
			} else if (show === false && ( (conversion_close && conversion ) || !conversion )) {
				$box.fadeOut('slow');
			}
		}else if (animation === 'disable') {
			if (show === true ) {
				$box.show();
			} else if (show === false && ( (conversion_close && conversion ) || !conversion )  ) {
				$box.hide();
			}
		} else {
			if (show === true ) {
				$box.slideDown('slow');
			} else if (show === false && ( (conversion_close && conversion ) || !conversion )  ) {
				$box.slideUp('slow');
			}
		}

		//background
		if (show === true && $bgopa > 0 && !$box.hasClass('spu-top-bar') && !$box.hasClass('spu-bottom-bar')) {
			if (animation === 'disable') {
				$bg.show();
			} else {
				$bg.fadeIn();
			}
		} else if (show === false && ( (conversion_close && conversion ) || !conversion ) ) {
			if (animation === 'disable') {
				$bg.hide();
			} else {
				$bg.fadeOut();
			}
		}

		return show;
	}

	return {
		show: function( box_id ) {
			return toggleBox( box_id, true, false );
		},
		hide: function( box_id, conversion ) {
			return toggleBox( box_id, false, conversion );
		},
		resize: function (box_id) {
			return fixSize( box_id );
        },
		request: function( data, url, success_cb, error_cb ) {
			return request( data, url, success_cb, error_cb );
		}
	}

}
if( spuvar.ajax_mode ) {

	var data = {
		pid : spuvar.pid,
		referrer : document.referrer,
		current_url : document.documentURI,
		query_string : document.location.search,
		is_category : spuvar.is_category,
		is_archive : spuvar.is_archive,
		is_preview: spuvar.is_preview
	}
	,success_cb = function(response) {

		$('body').append(response);
		$(".spu-box").imagesLoaded( function() {
			window.SPU = SPU_master();
			SPU_reload_forms(); //remove spu_Action from forms
		});
	},
	error_cb 	= function (data, error, errorThrown){
		console.log('Problem loading popups - error: ' + error + ' - ' + errorThrown);
	}
	request(data, spuvar.ajax_mode_url , success_cb, error_cb, 'html');
} else {
	$(".spu-box").imagesLoaded( function(){
		window.SPU = SPU_master();
	});
}

	/**
	 * Ajax requests
	 * @param data
	 * @param url
	 * @param success_cb
	 * @param error_cb
	 * @param dataType
	 */
	function request(data, url, success_cb, error_cb, dataType){
		// Prepare variables.
		var ajax       = {
				url:      spuvar.ajax_url,
				data:     data,
				cache:    false,
				type:     'POST',
				dataType: 'json',
				timeout:  30000
			},
			dataType   = dataType || false,
			success_cb = success_cb || false,
			error_cb   = error_cb   || false;

		// Set ajax url is supplied
		if ( url ) {
			ajax.url = url;
		}
		// Set success callback if supplied.
		if ( success_cb ) {
			ajax.success = success_cb;
		}

		// Set error callback if supplied.
		if ( error_cb ) {
			ajax.error = error_cb;
		}

		// Change dataType if supplied.
		if ( dataType ) {
			ajax.dataType = dataType;
		}
		// Make the ajax request.
		$.ajax(ajax);

	}
/**
 * Cookie functions
 */
function spuCreateCookie(name, value, type, duration) {
	if (duration) {
		var date = new Date();

		if( type == 'h' )
			date.setTime(date.getTime() + (duration * 60 * 60 * 1000));
		else
			date.setTime(date.getTime() + (duration * 24 * 60 * 60 * 1000));

		var expires = "; expires=" + date.toGMTString();
	} else var expires = "";
	document.cookie = name + "=" + value + expires + "; path=/";
}

function spuReadCookie(name) {
	var nameEQ = name + "=";
	var ca = document.cookie.split(';');
	for (var i = 0; i < ca.length; i++) {
		var c = ca[i];
		while (c.charAt(0) == ' ') c = c.substring(1, c.length);
		if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
	}
	return null;
}

/**
 * Social Callbacks
 */
var SPUfb = false;

var FbTimer = setInterval(function(){
	if( typeof FB !== 'undefined' && ! SPUfb) {
		subscribeFbEvent();

	}
},1000);

if ( typeof twttr !== 'undefined') {
	try{
		twttr.ready(function(twttr) {
			twttr.events.bind('tweet', twitterCB);
			twttr.events.bind('follow', twitterCB);
		});
	}catch(ex){}
}


function subscribeFbEvent(){
	try {
		FB.Event.subscribe('edge.create', function (href, html_element) {
			var box_id = $(html_element).parents('.spu-box').data('box-id');
			if (box_id) {
				SPU.hide(box_id, false, true);
			}
		});
	}catch(ex){}
	SPUfb = true;
	clearInterval(FbTimer);
}
function twitterCB(intent_event) {

	var box_id = $(intent_event.target).parents('.spu-box').data('box-id');

	if( box_id) {
		SPU.hide(box_id, false, true);
	}
}
function googleCB(a) {

	if( "on" == a.state ) {

		var box_id = jQuery('.spu-gogl').data('box-id');
		if( box_id) {
			SPU.hide(box_id, false, true);
		}
	}
}
function closeGoogle(a){
	if( "confirm" == a.type )
	{
		var box_id = jQuery('.spu-gogl').data('box-id');
		if( box_id) {
			SPU.hide(box_id, false, true);

		}
	}
}
function SPU_reload_socials(){
	if( typeof spuvar_social != 'undefined' && spuvar_social.facebook) {

		// reload fb
		try{
			FB.XFBML.parse();
		}catch(ex){}
	}
	if( typeof spuvar_social != 'undefined' && spuvar_social.google){
		try {
			// reload google
			gapi.plusone.go();
		}catch(ex){}
	}
	if( typeof spuvar_social != 'undefined' && spuvar_social.twitter ) {
		try {
			//reload twitter
			twttr.widgets.load();
		}catch(ex){}
	}
}
function SPU_reload_forms(){
	// Clear actions
	$('.spu-box form').each( function(){
		var action = $(this).attr('action');
		if( action ){
			$(this).attr('action' , action.replace('?spu_action=spu_load',''));
		}
	});

	// CF7 > 4.8
	if ( typeof wpcf7 !== 'undefined' && wpcf7 !== null && wpcf7.initForm ) {

		$('.spu-box div.wpcf7 > form').each(function () {
			wpcf7.initForm( $(this) );

			if ( wpcf7.cached ) {
				wpcf7.refill( $(this) );
			}
		});
	}

	// Old Version CF7
	if ($.fn.wpcf7InitForm) {
		$('.spu-box div.wpcf7 > form').wpcf7InitForm();
	}
}
})(jQuery);

}
catch(e){console.error("An error has occurred: "+e.stack);}
/* https://kathigitis-aepp.gr/wp-content/themes/siteorigin-corp/js/jquery.fitvids.min.js */
try{
!function(d){"use strict";d.fn.fitVids=function(t){var i={customSelector:null,ignore:null};if(!document.getElementById("fit-vids-style")){var e=document.head||document.getElementsByTagName("head")[0],r=document.createElement("div");r.innerHTML='<p>x</p><style id="fit-vids-style">.fluid-width-video-wrapper{width:100%;position:relative;padding:0;}.fluid-width-video-wrapper iframe,.fluid-width-video-wrapper object,.fluid-width-video-wrapper embed {position:absolute;top:0;left:0;width:100%;height:100%;}</style>',e.appendChild(r.childNodes[1])}return t&&d.extend(i,t),this.each(function(){var t=['iframe[src*="player.vimeo.com"]','iframe[src*="youtube.com"]','iframe[src*="youtube-nocookie.com"]','iframe[src*="kickstarter.com"][src*="video.html"]',"object","embed"];i.customSelector&&t.push(i.customSelector);var a=".fitvidsignore";i.ignore&&(a=a+", "+i.ignore);var e=d(this).find(t.join(","));(e=(e=e.not("object object")).not(a)).each(function(t){var e=d(this);if(!(0<e.parents(a).length||"embed"===this.tagName.toLowerCase()&&e.parent("object").length||e.parent(".fluid-width-video-wrapper").length)){e.css("height")||e.css("width")||!isNaN(e.attr("height"))&&!isNaN(e.attr("width"))||(e.attr("height",9),e.attr("width",16));var i=("object"===this.tagName.toLowerCase()||e.attr("height")&&!isNaN(parseInt(e.attr("height"),10))?parseInt(e.attr("height"),10):e.height())/(isNaN(parseInt(e.attr("width"),10))?e.width():parseInt(e.attr("width"),10));if(!e.attr("id")){var r="fitvid"+t;e.attr("id",r)}e.wrap('<div class="fluid-width-video-wrapper"></div>').parent(".fluid-width-video-wrapper").css("padding-top",100*i+"%"),e.removeAttr("height").removeAttr("width")}})})}}(window.jQuery||window.Zepto);

}
catch(e){console.error("An error has occurred: "+e.stack);}
/* https://kathigitis-aepp.gr/wp-content/themes/siteorigin-corp/js/jquery.theme.min.js */
try{
jQuery(function(r){r.fn.siteoriginCorpIsVisible=function(){var o=this[0].getBoundingClientRect();return 0<=o.bottom&&0<=o.right&&o.top<=(window.innerHeight||document.documentElement.clientHeight)&&o.left<=(window.innerWidth||document.documentElement.clientWidth)};r(document).mousemove(function(o){({x:o.pageX,y:o.pageY})}),void 0!==r.fn.fitVids&&r(".entry-content, .entry-content .panel, .entry-video, .woocommerce #main").fitVids({ignore:".tableauViz"}),r(document).ready(function(){r(".flexslider").each(function(){r(this).flexslider({animation:"slide",customDirectionNav:r(this).find(".flex-direction-nav a"),start:function(){r(".flexslider .slides img").show()}})})}),r("body.no-js").removeClass("no-js"),r("body").hasClass("css3-animations")&&(r(".menu-item").children("a").focus(function(){r(this).parents("ul, li").addClass("focus")}),r(".menu-item").children("a").click(function(){r(this).parents("ul, li").removeClass("focus")}),r(".menu-item").children("a").focusout(function(){r(this).parents("ul, li").removeClass("focus")})),r(document).ready(function(o){window.location.hash||(o('#site-navigation a[href="'+window.location.href+'"]').parent("li").addClass("current-menu-item"),o(window).scroll(function(){o("#site-navigation ul li").hasClass("current")?(o("#site-navigation li").removeClass("current-menu-item"),o("#site-navigation li.current-menu-ancestor").removeClass("current-menu-ancestor current-menu-parent")):0==o(document).scrollTop()&&(o('#site-navigation a[href="'+window.location.href+'"]').parent("li").addClass("current-menu-item"),o('#site-navigation a[href="'+window.location.href+'"]').parents("li.menu-item-has-children").addClass("current-menu-ancestor current-menu-parent"))}))}),headerHeight=function(){var o=r("#wpadminbar").outerHeight(),t=r("body").hasClass("admin-bar"),e=r("header").hasClass("sticky");return e&&t&&600<r(window).width()?o+r("header").outerHeight()-1:e?r("header").outerHeight()-1:0},r.fn.siteoriginCorpSmoothScroll=function(){r("body").hasClass("disable-smooth-scroll")||r(this).click(function(o){var t=this.hash.substring(1);if(0<r(".panel-grid [id*="+t+"]").length?(r("#site-navigation .current").removeClass("current"),r(this).parent("li").addClass("current")):r("#site-navigation .current").removeClass("current"),location.pathname.replace(/^\//,"")==this.pathname.replace(/^\//,"")&&location.hostname==this.hostname){var e=r(this.hash);if((e=e.length?e:r("[name="+this.hash.slice(1)+"]")).length)return r("html, body").animate({scrollTop:e.offset().top-headerHeight()},{duration:1200,start:function(){r("html, body").on("wheel touchmove",function(){r("html, body").stop().off("wheel touchmove")})},complete:function(){r("html, body").finish().off("wheel touchmove")}}),!1}})},r(window).load(function(){r('#site-navigation a[href*="#"]:not([href="#"]), .comments-link a[href*="#"]:not([href="#"]), .woocommerce-review-link[href*="#"]:not([href="#"]), .corp-scroll[href*="#"]:not([href="#"])').siteoriginCorpSmoothScroll()}),r(window).load(function(){if(location.pathname.replace(/^\//,"")==window.location.pathname.replace(/^\//,"")&&location.hostname==window.location.hostname){var o=r(window.location.hash);if(o.length)return r("html, body").animate({scrollTop:o.offset().top-headerHeight()},0),!1}}),r(window).on("scroll",function(){var s=r(window).scrollTop(),a="no";r(".panel-row-style").each(function(){var o="#"+r(this).attr("id"),t=r(this).offset().top-1,e=r(this).outerHeight(),i=t-headerHeight(),n=t+e-headerHeight();if(i<=s&&s<=n)return a="yes",r("#site-navigation .current").removeClass("current"),r('#site-navigation a[href$="'+o+'"]').parent("li").addClass("current"),!1;"no"===a&&r("#site-navigation .current").removeClass("current")})});var i=!1;r("#mobile-menu-button").click(function(o){o.preventDefault();var t=r(this);if(t.toggleClass("to-close"),!1===i){(i=r("<div></div>").append(r(".main-navigation ul").first().clone()).attr("id","mobile-navigation").appendTo("#masthead").hide()).find("#primary-menu").show().css("opacity",1),i.find(".menu-item-has-children > a").addClass("has-dropdown"),i.find(".page_item_has_children > a").addClass("has-dropdown"),i.find(".has-dropdown").after('<button class="dropdown-toggle" aria-expanded="false"><i class="icon-angle-down" aria-hidden="true"></i></button>'),i.find(".dropdown-toggle").click(function(o){o.preventDefault(),r(this).toggleClass("toggle-open").next(".children, .sub-menu").slideToggle("fast")}),i.find(".has-dropdown").click(function(o){void 0!==r(this).attr("href")&&"#"!=r(this).attr("href")||(o.preventDefault(),r(this).siblings(".dropdown-toggle").trigger("click"))});function e(){if(r("#masthead").hasClass("sticky")){var o="fixed"===r("#wpadminbar").css("position")?r("#wpadminbar").outerHeight():0,t=r("#masthead").innerHeight(),e=r(window).height()-t-o;r("#mobile-navigation").css("max-height",e)}}e(),r(window).resize(e),r("#mobile-navigation").scroll(e)}i.slideToggle("fast"),r("#mobile-navigation a").click(function(o){(!r(this).hasClass("has-dropdown")||void 0!==r(this).attr("href")&&"#"!==r(this).attr("href"))&&i.is(" :visible")&&i.slideUp("fast"),t.removeClass("to-close")}),r('#mobile-navigation a[href*="#"]:not([href="#"])').siteoriginCorpSmoothScroll()}),r("#search-button").click(function(o){o.preventDefault();var t=r(this);t.toggleClass("close-search"),r("input[type='search']").each(function(){r(this).attr("size",r(this).attr("placeholder").length)});function e(){var o=r(window).width(),t=r(window).height();r("#fullscreen-search").css({height:t+"px",width:o+"px"})}e(),r(window).resize(e),t.hasClass("close-search")?(r("body").css("margin-right",window.innerWidth-r("body").width()+"px"),r("body").css("overflow","hidden")):(r("body").css("overflow",""),r("body").css("margin-right","")),r("#fullscreen-search").slideToggle("fast"),r("#fullscreen-search input").focus()}),r("#fullscreen-search-form").submit(function(){r(this).find("button svg").hide(),r(this).find("button svg:last-child").show()}),r("#fullscreen-search #search-close-button").click(function(o){o.preventDefault(),r("#search-button.close-search").trigger("click")}),r(document).keyup(function(o){27===o.keyCode&&r("#search-button.close-search").trigger("click")});function o(){(window.pageYOffset||document.documentElement.scrollTop)>r("#masthead").outerHeight()?r("#scroll-to-top").hasClass("show")||r("#scroll-to-top").css("pointer-events","auto").addClass("show"):r("#scroll-to-top").hasClass("show")&&r("#scroll-to-top").css("pointer-events","none").removeClass("show")}o(),r(window).scroll(o),r("#scroll-to-top").click(function(){r("html, body").animate({scrollTop:0})}),("ontouchstart"in document.documentElement||window.navigator.msMaxTouchPoints||window.navigator.MaxTouchPoints)&&(/iPad|iPhone|iPod/.test(navigator.userAgent)&&!window.MSStream&&(r("body").css("cursor","pointer"),r("body").addClass("ios")),r(".main-navigation #primary-menu").find(".menu-item-has-children > a").each(function(){r(this).on("click touchend",function(o){var t=r(this);o.stopPropagation(),"click"!=o.type&&(t.parent().hasClass("hover")||(r(".menu-item.hover").removeClass("hover"),t.parents(".menu-item").addClass("hover"),o.preventDefault()),r(document).one("click",function(){t.parent().removeClass("hover")}))})})),r("#portfolio-loop").length&&($infinite_scroll=0,r(document.body).on("post-load",function(){var o=r("#portfolio-loop");$infinite_scroll+=1;o=r("#projects-container");var t=r("#infinite-view-"+$infinite_scroll).find(".jetpack-portfolio.post");t.hide(),o.append(t).isotope("appended",t)}))}),function(p){p(window).load(function(){siteoriginCorp.logoScale=parseFloat(siteoriginCorp.logoScale),p(".blog-layout-masonry").length&&p(".blog-layout-masonry").masonry({itemSelector:".hentry",columnWidth:".hentry"});var t=p("#projects-container");p(".portfolio-filter-terms").length&&t.isotope({itemSelector:".post",filter:"*",layoutMode:"fitRows",resizable:!0}),p(".portfolio-filter-terms button").click(function(){var o=p(this).attr("data-filter");return t.isotope({filter:o}),p(".portfolio-filter-terms button").removeClass("active"),p(this).addClass("active"),!1});var i=p("#masthead"),n={top:parseInt(i.css("padding-top")),bottom:parseInt(i.css("padding-bottom"))};if(i.data("scale-logo")){var s=i.find(".site-branding img"),o=s.width(),e=s.height(),a=o*siteoriginCorp.logoScale,r=e*siteoriginCorp.logoScale;p(".site-branding img").wrap("<div class='custom-logo-wrapper'></div>");function l(){var o=i.find(".site-branding > *"),t=window.pageYOffset||document.documentElement.scrollTop;if(0<t?i.css({"padding-top":n.top*siteoriginCorp.logoScale,"padding-bottom":n.bottom*siteoriginCorp.logoScale}).addClass("stuck"):i.css({"padding-top":n.top,"padding-bottom":n.bottom}).removeClass("stuck"),s.length)if(0<t){var e=siteoriginCorp.logoScale+Math.max(0,48-t)/48*(1-siteoriginCorp.logoScale);s.height()==r&&s.width()==a&&e==siteoriginCorp.logoScale||p(".site-branding img").css({width:100*e+"%"})}else p(".site-branding img").css({width:""});else 0<t?o.css("transform","scale("+siteoriginCorp.logoScale+")"):o.css("transform","scale(1)")}l(),p(window).scroll(l).resize(l)}if(p("#masthead").hasClass("sticky")){i=p("#masthead");function c(){0<p(window).scrollTop()?p(i).addClass("stuck"):p(i).removeClass("stuck")}var d=p('<div class="masthead-sentinel"></div>').insertAfter(i),h=p("#topbar"),u=p('#topbar .woocommerce-store-notice[style*="display: none"]');c(),p(window).scroll(c);function m(){p("body").hasClass("mobile-header-ns")&&p(window).width()<siteoriginCorp.collapse||(!1!==d&&d.css("height",i.outerHeight()),p("body").hasClass("no-topbar")||h.siteoriginCorpIsVisible()||p("body").addClass("topbar-out"),h.length&&p("body").hasClass("topbar-out")&&h.siteoriginCorpIsVisible()&&p("body").removeClass("topbar-out"),p("body").hasClass("no-topbar")&&!p(window).scrollTop()&&p("body").addClass("topbar-out"),p("body").hasClass("no-topbar")||!p("body").hasClass("no-topbar")&&p("body").hasClass("topbar-out")||u.length?i.css("position","fixed"):p("body").hasClass("no-topbar")||p("body").hasClass("topbar-out")||i.css("position","absolute"))}m(),p(window).resize(m).scroll(m)}})}(jQuery);

}
catch(e){console.error("An error has occurred: "+e.stack);}
/* https://kathigitis-aepp.gr/wp-content/themes/siteorigin-corp/js/skip-link-focus-fix.min.js */
try{
/(trident|msie)/i.test(navigator.userAgent)&&document.getElementById&&window.addEventListener&&window.addEventListener("hashchange",function(){var t,e=location.hash.substring(1);/^[A-z0-9_-]+$/.test(e)&&(t=document.getElementById(e))&&(/^(?:a|select|input|button|textarea)$/i.test(t.tagName)||(t.tabIndex=-1),t.focus())},!1);

}
catch(e){console.error("An error has occurred: "+e.stack);}
/* https://kathigitis-aepp.gr/wp-includes/js/wp-embed.min.js */
try{
/*! This file is auto-generated */
!function(d,l){"use strict";var e=!1,o=!1;if(l.querySelector)if(d.addEventListener)e=!0;if(d.wp=d.wp||{},!d.wp.receiveEmbedMessage)if(d.wp.receiveEmbedMessage=function(e){var t=e.data;if(t)if(t.secret||t.message||t.value)if(!/[^a-zA-Z0-9]/.test(t.secret)){var r,a,i,s,n,o=l.querySelectorAll('iframe[data-secret="'+t.secret+'"]'),c=l.querySelectorAll('blockquote[data-secret="'+t.secret+'"]');for(r=0;r<c.length;r++)c[r].style.display="none";for(r=0;r<o.length;r++)if(a=o[r],e.source===a.contentWindow){if(a.removeAttribute("style"),"height"===t.message){if(1e3<(i=parseInt(t.value,10)))i=1e3;else if(~~i<200)i=200;a.height=i}if("link"===t.message)if(s=l.createElement("a"),n=l.createElement("a"),s.href=a.getAttribute("src"),n.href=t.value,n.host===s.host)if(l.activeElement===a)d.top.location.href=t.value}}},e)d.addEventListener("message",d.wp.receiveEmbedMessage,!1),l.addEventListener("DOMContentLoaded",t,!1),d.addEventListener("load",t,!1);function t(){if(!o){o=!0;var e,t,r,a,i=-1!==navigator.appVersion.indexOf("MSIE 10"),s=!!navigator.userAgent.match(/Trident.*rv:11\./),n=l.querySelectorAll("iframe.wp-embedded-content");for(t=0;t<n.length;t++){if(!(r=n[t]).getAttribute("data-secret"))a=Math.random().toString(36).substr(2,10),r.src+="#?secret="+a,r.setAttribute("data-secret",a);if(i||s)(e=r.cloneNode(!0)).removeAttribute("security"),r.parentNode.replaceChild(e,r)}}}}(window,document);

}
catch(e){console.error("An error has occurred: "+e.stack);}
/* https://kathigitis-aepp.gr/wp-content/plugins/js_composer/assets/js/dist/js_composer_front.min.js */
try{
/*!
 * WPBakery Page Builder v6.0.0 (https://wpbakery.com)
 * Copyright 2011-2020 Michael M, WPBakery
 * License: Commercial. More details: https://go.wpbakery.com/licensing
 */

// jscs:disable
// jshint ignore: start

document.documentElement.className+=" js_active ",document.documentElement.className+="ontouchstart"in document.documentElement?" vc_mobile ":" vc_desktop ",function(){for(var prefix=["-webkit-","-moz-","-ms-","-o-",""],i=0;i<prefix.length;i++)prefix[i]+"transform"in document.documentElement.style&&(document.documentElement.className+=" vc_transform ")}(),function(){"function"!=typeof window.vc_js&&(window.vc_js=function(){"use strict";vc_toggleBehaviour(),vc_tabsBehaviour(),vc_accordionBehaviour(),vc_teaserGrid(),vc_carouselBehaviour(),vc_slidersBehaviour(),vc_prettyPhoto(),vc_pinterest(),vc_progress_bar(),vc_plugin_flexslider(),vc_gridBehaviour(),vc_rowBehaviour(),vc_prepareHoverBox(),vc_googleMapsPointer(),vc_ttaActivation(),jQuery(document).trigger("vc_js"),window.setTimeout(vc_waypoints,500)}),"function"!=typeof window.vc_plugin_flexslider&&(window.vc_plugin_flexslider=function($parent){($parent?$parent.find(".wpb_flexslider"):jQuery(".wpb_flexslider")).each(function(){var this_element=jQuery(this),sliderTimeout=1e3*parseInt(this_element.attr("data-interval"),10),sliderFx=this_element.attr("data-flex_fx"),slideshow=!0;0==sliderTimeout&&(slideshow=!1),this_element.is(":visible")&&this_element.flexslider({animation:sliderFx,slideshow:slideshow,slideshowSpeed:sliderTimeout,sliderSpeed:800,smoothHeight:!0})})}),"function"!=typeof window.vc_googleplus&&(window.vc_googleplus=function(){0<jQuery(".wpb_googleplus").length&&function(){var po=document.createElement("script");po.type="text/javascript",po.async=!0,po.src="https://apis.google.com/js/plusone.js";var s=document.getElementsByTagName("script")[0];s.parentNode.insertBefore(po,s)}()}),"function"!=typeof window.vc_pinterest&&(window.vc_pinterest=function(){0<jQuery(".wpb_pinterest").length&&function(){var po=document.createElement("script");po.type="text/javascript",po.async=!0,po.src="https://assets.pinterest.com/js/pinit.js";var s=document.getElementsByTagName("script")[0];s.parentNode.insertBefore(po,s)}()}),"function"!=typeof window.vc_progress_bar&&(window.vc_progress_bar=function(){void 0!==jQuery.fn.vcwaypoint&&jQuery(".vc_progress_bar").each(function(){var $el=jQuery(this);$el.vcwaypoint(function(){$el.find(".vc_single_bar").each(function(index){var bar=jQuery(this).find(".vc_bar"),val=bar.data("percentage-value");setTimeout(function(){bar.css({width:val+"%"})},200*index)})},{offset:"85%"})})}),"function"!=typeof window.vc_waypoints&&(window.vc_waypoints=function(){void 0!==jQuery.fn.vcwaypoint&&jQuery(".wpb_animate_when_almost_visible:not(.wpb_start_animation)").each(function(){var $el=jQuery(this);$el.vcwaypoint(function(){$el.addClass("wpb_start_animation animated")},{offset:"85%"})})}),"function"!=typeof window.vc_toggleBehaviour&&(window.vc_toggleBehaviour=function($el){function event(e){e&&e.preventDefault&&e.preventDefault();var element=jQuery(this).closest(".vc_toggle"),content=element.find(".vc_toggle_content");element.hasClass("vc_toggle_active")?content.slideUp({duration:300,complete:function(){element.removeClass("vc_toggle_active")}}):content.slideDown({duration:300,complete:function(){element.addClass("vc_toggle_active")}})}$el?$el.hasClass("vc_toggle_title")?$el.unbind("click").on("click",event):$el.find(".vc_toggle_title").off("click").on("click",event):jQuery(".vc_toggle_title").off("click").on("click",event)}),"function"!=typeof window.vc_tabsBehaviour&&(window.vc_tabsBehaviour=function($tab){if(jQuery.ui){var $call=$tab||jQuery(".wpb_tabs, .wpb_tour"),ver=jQuery.ui&&jQuery.ui.version?jQuery.ui.version.split("."):"1.10",old_version=1===parseInt(ver[0],10)&&parseInt(ver[1],10)<9;$call.each(function(index){var $tabs,interval=jQuery(this).attr("data-interval"),tabs_array=[];if($tabs=jQuery(this).find(".wpb_tour_tabs_wrapper").tabs({show:function(event,ui){wpb_prepare_tab_content(event,ui)},activate:function(event,ui){wpb_prepare_tab_content(event,ui)}}),interval&&0<interval)try{$tabs.tabs("rotate",1e3*interval)}catch(err){window.console&&window.console.warn&&console.warn("tabs behaviours error",err)}jQuery(this).find(".wpb_tab").each(function(){tabs_array.push(this.id)}),jQuery(this).find(".wpb_tabs_nav li").on("click",function(e){return e&&e.preventDefault&&e.preventDefault(),old_version?$tabs.tabs("select",jQuery("a",this).attr("href")):$tabs.tabs("option","active",jQuery(this).index()),!1}),jQuery(this).find(".wpb_prev_slide a, .wpb_next_slide a").on("click",function(e){var index,length;e&&e.preventDefault&&e.preventDefault(),old_version?(index=$tabs.tabs("option","selected"),jQuery(this).parent().hasClass("wpb_next_slide")?index++:index--,index<0?index=$tabs.tabs("length")-1:index>=$tabs.tabs("length")&&(index=0),$tabs.tabs("select",index)):(index=$tabs.tabs("option","active"),length=$tabs.find(".wpb_tab").length,index=jQuery(this).parent().hasClass("wpb_next_slide")?length<=index+1?0:index+1:index-1<0?length-1:index-1,$tabs.tabs("option","active",index))})})}}),"function"!=typeof window.vc_accordionBehaviour&&(window.vc_accordionBehaviour=function(){jQuery(".wpb_accordion").each(function(index){var $tabs,active_tab,collapsible,$this=jQuery(this);$this.attr("data-interval"),collapsible=!1===(active_tab=!isNaN(jQuery(this).data("active-tab"))&&0<parseInt($this.data("active-tab"),10)&&parseInt($this.data("active-tab"),10)-1)||"yes"===$this.data("collapsible"),$tabs=$this.find(".wpb_accordion_wrapper").accordion({header:"> div > h3",autoHeight:!1,heightStyle:"content",active:active_tab,collapsible:collapsible,navigation:!0,activate:vc_accordionActivate,change:function(event,ui){void 0!==jQuery.fn.isotope&&ui.newContent.find(".isotope").isotope("layout"),vc_carouselBehaviour(ui.newPanel)}}),!0===$this.data("vcDisableKeydown")&&($tabs.data("uiAccordion")._keydown=function(){})})}),"function"!=typeof window.vc_teaserGrid&&(window.vc_teaserGrid=function(){var layout_modes={fitrows:"fitRows",masonry:"masonry"};jQuery(".wpb_grid .teaser_grid_container:not(.wpb_carousel), .wpb_filtered_grid .teaser_grid_container:not(.wpb_carousel)").each(function(){var $container=jQuery(this),$thumbs=$container.find(".wpb_thumbnails"),layout_mode=$thumbs.attr("data-layout-mode");$thumbs.isotope({itemSelector:".isotope-item",layoutMode:void 0===layout_modes[layout_mode]?"fitRows":layout_modes[layout_mode]}),$container.find(".categories_filter a").data("isotope",$thumbs).on("click",function(e){e&&e.preventDefault&&e.preventDefault();var $thumbs=jQuery(this).data("isotope");jQuery(this).parent().parent().find(".active").removeClass("active"),jQuery(this).parent().addClass("active"),$thumbs.isotope({filter:jQuery(this).attr("data-filter")})}),jQuery(window).bind("load resize",function(){$thumbs.isotope("layout")})})}),"function"!=typeof window.vc_carouselBehaviour&&(window.vc_carouselBehaviour=function($parent){($parent?$parent.find(".wpb_carousel"):jQuery(".wpb_carousel")).each(function(){var $this=jQuery(this);if(!0!==$this.data("carousel_enabled")&&$this.is(":visible")){$this.data("carousel_enabled",!0);getColumnsCount(jQuery(this));jQuery(this).hasClass("columns_count_1")&&0;var carousel_li=jQuery(this).find(".wpb_thumbnails-fluid li");carousel_li.css({"margin-right":carousel_li.css("margin-left"),"margin-left":0});var fluid_ul=jQuery(this).find("ul.wpb_thumbnails-fluid");fluid_ul.width(fluid_ul.width()+300),jQuery(window).on("resize",function(){screen_size!=(screen_size=getSizeName())&&window.setTimeout(function(){location.reload()},20)})}})}),"function"!=typeof window.vc_slidersBehaviour&&(window.vc_slidersBehaviour=function(){jQuery(".wpb_gallery_slides").each(function(index){var $imagesGrid,this_element=jQuery(this);if(this_element.hasClass("wpb_slider_nivo")){var sliderTimeout=1e3*this_element.attr("data-interval");0===sliderTimeout&&(sliderTimeout=9999999999),this_element.find(".nivoSlider").nivoSlider({effect:"boxRainGrow,boxRain,boxRainReverse,boxRainGrowReverse",slices:15,boxCols:8,boxRows:4,animSpeed:800,pauseTime:sliderTimeout,startSlide:0,directionNav:!0,directionNavHide:!0,controlNav:!0,keyboardNav:!1,pauseOnHover:!0,manualAdvance:!1,prevText:"Prev",nextText:"Next"})}else this_element.hasClass("wpb_image_grid")&&(jQuery.fn.imagesLoaded?$imagesGrid=this_element.find(".wpb_image_grid_ul").imagesLoaded(function(){$imagesGrid.isotope({itemSelector:".isotope-item",layoutMode:"fitRows"})}):this_element.find(".wpb_image_grid_ul").isotope({itemSelector:".isotope-item",layoutMode:"fitRows"}))})}),"function"!=typeof window.vc_prettyPhoto&&(window.vc_prettyPhoto=function(){try{jQuery&&jQuery.fn&&jQuery.fn.prettyPhoto&&jQuery('a.prettyphoto, .gallery-icon a[href*=".jpg"]').prettyPhoto({animationSpeed:"normal",hook:"data-rel",padding:15,opacity:.7,showTitle:!0,allowresize:!0,counter_separator_label:"/",hideflash:!1,deeplinking:!1,modal:!1,callback:function(){-1<location.href.indexOf("#!prettyPhoto")&&(location.hash="")},social_tools:""})}catch(err){window.console&&window.console.warn&&window.console.warn("vc_prettyPhoto initialize error",err)}}),"function"!=typeof window.vc_google_fonts&&(window.vc_google_fonts=function(){return window.console&&window.console.warn&&window.console.warn("function vc_google_fonts is deprecated, no need to use it"),!1}),window.vcParallaxSkroll=!1,"function"!=typeof window.vc_rowBehaviour&&(window.vc_rowBehaviour=function(){var vcSkrollrOptions,callSkrollInit,$=window.jQuery;function fullWidthRow(){var $elements=$('[data-vc-full-width="true"]');$.each($elements,function(key,item){var $el=$(this);$el.addClass("vc_hidden");var $el_full=$el.next(".vc_row-full-width");if($el_full.length||($el_full=$el.parent().next(".vc_row-full-width")),$el_full.length){var padding,paddingRight,el_margin_left=parseInt($el.css("margin-left"),10),el_margin_right=parseInt($el.css("margin-right"),10),offset=0-$el_full.offset().left-el_margin_left,width=$(window).width();if("rtl"===$el.css("direction")&&(offset-=$el_full.width(),offset+=width,offset+=el_margin_left,offset+=el_margin_right),$el.css({position:"relative",left:offset,"box-sizing":"border-box",width:width}),!$el.data("vcStretchContent"))"rtl"===$el.css("direction")?((padding=offset)<0&&(padding=0),(paddingRight=offset)<0&&(paddingRight=0)):((padding=-1*offset)<0&&(padding=0),(paddingRight=width-padding-$el_full.width()+el_margin_left+el_margin_right)<0&&(paddingRight=0)),$el.css({"padding-left":padding+"px","padding-right":paddingRight+"px"});$el.attr("data-vc-full-width-init","true"),$el.removeClass("vc_hidden"),$(document).trigger("vc-full-width-row-single",{el:$el,offset:offset,marginLeft:el_margin_left,marginRight:el_margin_right,elFull:$el_full,width:width})}}),$(document).trigger("vc-full-width-row",$elements)}function fullHeightRow(){var windowHeight,offsetTop,fullHeight,$element=$(".vc_row-o-full-height:first");$element.length&&(windowHeight=$(window).height(),(offsetTop=$element.offset().top)<windowHeight&&(fullHeight=100-offsetTop/(windowHeight/100),$element.css("min-height",fullHeight+"vh")));$(document).trigger("vc-full-height-row",$element)}$(window).off("resize.vcRowBehaviour").on("resize.vcRowBehaviour",fullWidthRow).on("resize.vcRowBehaviour",fullHeightRow),fullWidthRow(),fullHeightRow(),(0<window.navigator.userAgent.indexOf("MSIE ")||navigator.userAgent.match(/Trident.*rv\:11\./))&&$(".vc_row-o-full-height").each(function(){"flex"===$(this).css("display")&&$(this).wrap('<div class="vc_ie-flexbox-fixer"></div>')}),vc_initVideoBackgrounds(),callSkrollInit=!1,window.vcParallaxSkroll&&window.vcParallaxSkroll.destroy(),$(".vc_parallax-inner").remove(),$("[data-5p-top-bottom]").removeAttr("data-5p-top-bottom data-30p-top-bottom"),$("[data-vc-parallax]").each(function(){var skrollrSize,skrollrStart,$parallaxElement,parallaxImage,youtubeId;callSkrollInit=!0,"on"===$(this).data("vcParallaxOFade")&&$(this).children().attr("data-5p-top-bottom","opacity:0;").attr("data-30p-top-bottom","opacity:1;"),skrollrSize=100*$(this).data("vcParallax"),($parallaxElement=$("<div />").addClass("vc_parallax-inner").appendTo($(this))).height(skrollrSize+"%"),parallaxImage=$(this).data("vcParallaxImage"),(youtubeId=vcExtractYoutubeId(parallaxImage))?insertYoutubeVideoAsBackground($parallaxElement,youtubeId):void 0!==parallaxImage&&$parallaxElement.css("background-image","url("+parallaxImage+")"),skrollrStart=-(skrollrSize-100),$parallaxElement.attr("data-bottom-top","top: "+skrollrStart+"%;").attr("data-top-bottom","top: 0%;")}),callSkrollInit&&window.skrollr&&(vcSkrollrOptions={forceHeight:!1,smoothScrolling:!1,mobileCheck:function(){return!1}},window.vcParallaxSkroll=skrollr.init(vcSkrollrOptions),window.vcParallaxSkroll)}),"function"!=typeof window.vc_gridBehaviour&&(window.vc_gridBehaviour=function(){jQuery.fn.vcGrid&&jQuery("[data-vc-grid]").vcGrid()}),"function"!=typeof window.getColumnsCount&&(window.getColumnsCount=function(el){for(var find=!1,i=1;!1===find;){if(el.hasClass("columns_count_"+i))return find=!0,i;i++}});var screen_size=getSizeName();function getSizeName(){var screen_w=jQuery(window).width();return 1170<screen_w?"desktop_wide":960<screen_w&&screen_w<1169?"desktop":768<screen_w&&screen_w<959?"tablet":300<screen_w&&screen_w<767?"mobile":screen_w<300?"mobile_portrait":""}"function"!=typeof window.wpb_prepare_tab_content&&(window.wpb_prepare_tab_content=function(event,ui){var $ui_panel,$google_maps,panel=ui.panel||ui.newPanel,$pie_charts=panel.find(".vc_pie_chart:not(.vc_ready)"),$round_charts=panel.find(".vc_round-chart"),$line_charts=panel.find(".vc_line-chart"),$carousel=panel.find('[data-ride="vc_carousel"]');if(vc_carouselBehaviour(),vc_plugin_flexslider(panel),ui.newPanel.find(".vc_masonry_media_grid, .vc_masonry_grid").length&&ui.newPanel.find(".vc_masonry_media_grid, .vc_masonry_grid").each(function(){var grid=jQuery(this).data("vcGrid");grid&&grid.gridBuilder&&grid.gridBuilder.setMasonry&&grid.gridBuilder.setMasonry()}),panel.find(".vc_masonry_media_grid, .vc_masonry_grid").length&&panel.find(".vc_masonry_media_grid, .vc_masonry_grid").each(function(){var grid=jQuery(this).data("vcGrid");grid&&grid.gridBuilder&&grid.gridBuilder.setMasonry&&grid.gridBuilder.setMasonry()}),$pie_charts.length&&jQuery.fn.vcChat&&$pie_charts.vcChat(),$round_charts.length&&jQuery.fn.vcRoundChart&&$round_charts.vcRoundChart({reload:!1}),$line_charts.length&&jQuery.fn.vcLineChart&&$line_charts.vcLineChart({reload:!1}),$carousel.length&&jQuery.fn.carousel&&$carousel.carousel("resizeAction"),$ui_panel=panel.find(".isotope, .wpb_image_grid_ul"),$google_maps=panel.find(".wpb_gmaps_widget"),0<$ui_panel.length&&$ui_panel.isotope("layout"),$google_maps.length&&!$google_maps.is(".map_ready")){var $frame=$google_maps.find("iframe");$frame.attr("src",$frame.attr("src")),$google_maps.addClass("map_ready")}panel.parents(".isotope").length&&panel.parents(".isotope").each(function(){jQuery(this).isotope("layout")})}),"function"!=typeof window.vc_ttaActivation&&(window.vc_ttaActivation=function(){jQuery("[data-vc-accordion]").on("show.vc.accordion",function(e){var $=window.jQuery,ui={};ui.newPanel=$(this).data("vc.accordion").getTarget(),window.wpb_prepare_tab_content(e,ui)})}),"function"!=typeof window.vc_accordionActivate&&(window.vc_accordionActivate=function(event,ui){if(ui.newPanel.length&&ui.newHeader.length){var $pie_charts=ui.newPanel.find(".vc_pie_chart:not(.vc_ready)"),$round_charts=ui.newPanel.find(".vc_round-chart"),$line_charts=ui.newPanel.find(".vc_line-chart"),$carousel=ui.newPanel.find('[data-ride="vc_carousel"]');void 0!==jQuery.fn.isotope&&ui.newPanel.find(".isotope, .wpb_image_grid_ul").isotope("layout"),ui.newPanel.find(".vc_masonry_media_grid, .vc_masonry_grid").length&&ui.newPanel.find(".vc_masonry_media_grid, .vc_masonry_grid").each(function(){var grid=jQuery(this).data("vcGrid");grid&&grid.gridBuilder&&grid.gridBuilder.setMasonry&&grid.gridBuilder.setMasonry()}),vc_carouselBehaviour(ui.newPanel),vc_plugin_flexslider(ui.newPanel),$pie_charts.length&&jQuery.fn.vcChat&&$pie_charts.vcChat(),$round_charts.length&&jQuery.fn.vcRoundChart&&$round_charts.vcRoundChart({reload:!1}),$line_charts.length&&jQuery.fn.vcLineChart&&$line_charts.vcLineChart({reload:!1}),$carousel.length&&jQuery.fn.carousel&&$carousel.carousel("resizeAction"),ui.newPanel.parents(".isotope").length&&ui.newPanel.parents(".isotope").each(function(){jQuery(this).isotope("layout")})}}),"function"!=typeof window.initVideoBackgrounds&&(window.initVideoBackgrounds=function(){return window.console&&window.console.warn&&window.console.warn("this function is deprecated use vc_initVideoBackgrounds"),vc_initVideoBackgrounds()}),"function"!=typeof window.vc_initVideoBackgrounds&&(window.vc_initVideoBackgrounds=function(){jQuery("[data-vc-video-bg]").each(function(){var youtubeUrl,youtubeId,$element=jQuery(this);$element.data("vcVideoBg")?(youtubeUrl=$element.data("vcVideoBg"),(youtubeId=vcExtractYoutubeId(youtubeUrl))&&($element.find(".vc_video-bg").remove(),insertYoutubeVideoAsBackground($element,youtubeId)),jQuery(window).on("grid:items:added",function(event,$grid){$element.has($grid).length&&vcResizeVideoBackground($element)})):$element.find(".vc_video-bg").remove()})}),"function"!=typeof window.insertYoutubeVideoAsBackground&&(window.insertYoutubeVideoAsBackground=function($element,youtubeId,counter){if("undefined"==typeof YT||void 0===YT.Player)return 100<(counter=void 0===counter?0:counter)?void console.warn("Too many attempts to load YouTube api"):void setTimeout(function(){insertYoutubeVideoAsBackground($element,youtubeId,counter++)},100);var $container=$element.prepend('<div class="vc_video-bg vc_hidden-xs"><div class="inner"></div></div>').find(".inner");new YT.Player($container[0],{width:"100%",height:"100%",videoId:youtubeId,playerVars:{playlist:youtubeId,iv_load_policy:3,enablejsapi:1,disablekb:1,autoplay:1,controls:0,showinfo:0,rel:0,loop:1,wmode:"transparent"},events:{onReady:function(event){event.target.mute().setLoop(!0)}}}),vcResizeVideoBackground($element),jQuery(window).bind("resize",function(){vcResizeVideoBackground($element)})}),"function"!=typeof window.vcResizeVideoBackground&&(window.vcResizeVideoBackground=function($element){var iframeW,iframeH,marginLeft,marginTop,containerW=$element.innerWidth(),containerH=$element.innerHeight();containerW/containerH<16/9?(iframeW=containerH*(16/9),iframeH=containerH,marginLeft=-Math.round((iframeW-containerW)/2)+"px",marginTop=-Math.round((iframeH-containerH)/2)+"px"):(iframeH=(iframeW=containerW)*(9/16),marginTop=-Math.round((iframeH-containerH)/2)+"px",marginLeft=-Math.round((iframeW-containerW)/2)+"px"),iframeW+="px",iframeH+="px",$element.find(".vc_video-bg iframe").css({maxWidth:"1000%",marginLeft:marginLeft,marginTop:marginTop,width:iframeW,height:iframeH})}),"function"!=typeof window.vcExtractYoutubeId&&(window.vcExtractYoutubeId=function(url){if(void 0===url)return!1;var id=url.match(/(?:https?:\/{2})?(?:w{3}\.)?youtu(?:be)?\.(?:com|be)(?:\/watch\?v=|\/)([^\s&]+)/);return null!==id&&id[1]}),"function"!=typeof window.vc_googleMapsPointer&&(window.vc_googleMapsPointer=function(){var $=window.jQuery,$wpbGmapsWidget=$(".wpb_gmaps_widget");$wpbGmapsWidget.on("click",function(){$("iframe",this).css("pointer-events","auto")}),$wpbGmapsWidget.on("mouseleave",function(){$("iframe",this).css("pointer-events","none")}),$(".wpb_gmaps_widget iframe").css("pointer-events","none")}),"function"!=typeof window.vc_setHoverBoxPerspective&&(window.vc_setHoverBoxPerspective=function(hoverBox){hoverBox.each(function(){var $this=jQuery(this),perspective=4*$this.width()+"px";$this.css("perspective",perspective)})}),"function"!=typeof window.vc_setHoverBoxHeight&&(window.vc_setHoverBoxHeight=function(hoverBox){hoverBox.each(function(){var $this=jQuery(this),hoverBoxInner=$this.find(".vc-hoverbox-inner");hoverBoxInner.css("min-height",0);var frontHeight=$this.find(".vc-hoverbox-front-inner").outerHeight(),backHeight=$this.find(".vc-hoverbox-back-inner").outerHeight(),hoverBoxHeight=backHeight<frontHeight?frontHeight:backHeight;hoverBoxHeight<250&&(hoverBoxHeight=250),hoverBoxInner.css("min-height",hoverBoxHeight+"px")})}),"function"!=typeof window.vc_prepareHoverBox&&(window.vc_prepareHoverBox=function(){var hoverBox=jQuery(".vc-hoverbox");vc_setHoverBoxHeight(hoverBox),vc_setHoverBoxPerspective(hoverBox)}),jQuery(document).ready(window.vc_prepareHoverBox),jQuery(window).resize(window.vc_prepareHoverBox),jQuery(document).ready(function($){window.vc_js()})}(window.jQuery);

}
catch(e){console.error("An error has occurred: "+e.stack);}
