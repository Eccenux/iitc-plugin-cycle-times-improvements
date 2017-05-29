// ==UserScript==
// @id             iitc-plugin-cycle-times-improvements@jonatkins
// @name           IITC plugin: Show cycle/checkpoint times improved
// @category       Info
// @version        0.2.0
// @namespace      https://github.com/jonatkins/ingress-intel-total-conversion
// @description    [0.2.0] Show the times used for the septicycle and checkpoints. Additionaly shows delta time info.
// @include        https://*.ingress.com/intel*
// @include        http://*.ingress.com/intel*
// @match          https://*.ingress.com/intel*
// @match          http://*.ingress.com/intel*
// @include        https://*.ingress.com/mission/*
// @include        http://*.ingress.com/mission/*
// @match          https://*.ingress.com/mission/*
// @match          http://*.ingress.com/mission/*
// @grant          none
// @updateURL      https://github.com/Eccenux/iitc-plugin-cycle-times-improvements/raw/master/cycle-times-improvements.meta.js
// @downloadURL    https://github.com/Eccenux/iitc-plugin-cycle-times-improvements/raw/master/cycle-times-improvements.user.js
// ==/UserScript==

function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

// use own namespace for plugin
window.plugin.scoreCycleTimes = function() {};

window.plugin.scoreCycleTimes.CHECKPOINT = 5*60*60; //5 hours per checkpoint
window.plugin.scoreCycleTimes.CYCLE = 7*25*60*60; //7 25 hour 'days' per cycle


window.plugin.scoreCycleTimes.setup  = function() {

  // add a div to the sidebar, and basic style
  $('#sidebar').append('<div id="score_cycle_times_display"></div>');
  $('#score_cycle_times_display').css({'color':'#ffce00'});


  window.plugin.scoreCycleTimes.update();
};

/**
	Get time left information.
*/
var formatDeltaTime = function(deltaT) {
	var deltaInfo = '';
	if (deltaT < 0) {
	} else if (deltaT < 1) {
		deltaInfo = '&lt;1 min';
	} else if (deltaT < 60) {
		deltaInfo = Math.round(deltaT) + ' min';
	} else if (deltaT < 2*60) {
		var h = Math.floor(deltaT/60);
		deltaInfo = h + 'h ';
		deltaInfo += Math.round(deltaT - 60 * h) + ' min';
	} else if (deltaT < 48*60) {
		deltaInfo = '~' + Math.round(deltaT/60) + 'h';
	} else {
		deltaInfo = '~' + Math.round(deltaT/60/24) + ' days';
	}
	return deltaInfo;
};

/**
	Get reasonable update interval.
*/
var updateInterval = function(deltaT) {
	var interval;
	if (deltaT < 60) {
		interval = 10 * 1000;	// 10 seconds by default
	} else if (deltaT < 2.1*60) {
		interval = 20 * 1000;
	} else if (deltaT < 48*60) {
		interval = 10 * 60 * 1000;
	} else {
		interval = 60 * 60 * 1000;
	}
	return interval;
};

/**
 * Format time row.
 */
window.plugin.scoreCycleTimes.formatRow = function (now, label, time, className) {
	var deltaT = (time-now) / 1000 / 60;	// in minutes
	var deltaInfo = formatDeltaTime(deltaT);
	if (deltaInfo.length) {
		deltaInfo = ' ('+deltaInfo+')';
	}

	var timeStr = unixTimeToString(time,true);
	timeStr = timeStr.replace(/:00$/,''); //FIXME: doesn't remove seconds from AM/PM formatted dates

	var base = (!className) ? '<tr>' : '<tr class="'+className+'">';
	return base + '<td>'+label+'</td><td class="val">'+timeStr+deltaInfo+'</td></tr>';
};

/**
 * Update CP and cycle times.
 */
window.plugin.scoreCycleTimes.update = function() {

	// checkpoint and cycle start times are based on a simple modulus of the timestamp
	// no special epoch (other than the unix timestamp/javascript's 1970-01-01 00:00 UTC) is required

	// when regional scoreboards were introduced, the first cycle would have started at 2014-01-15 10:00 UTC - but it was
	// a few checkpoints in when scores were first added

	var now = new Date().getTime();

	var cycleStart = Math.floor(now / (window.plugin.scoreCycleTimes.CYCLE*1000)) * (window.plugin.scoreCycleTimes.CYCLE*1000);
	var cycleEnd = cycleStart + window.plugin.scoreCycleTimes.CYCLE*1000;

	var checkpointLength = window.plugin.scoreCycleTimes.CHECKPOINT*1000;
	var checkpointStart = Math.floor(now / checkpointLength) * checkpointLength;
	var checkpointEnd = checkpointStart + checkpointLength;

	var html = '<table>'
		+ plugin.scoreCycleTimes.formatRow(now, 'Cycle s.', cycleStart)
		+ plugin.scoreCycleTimes.formatRow(now, 'Prev CP', checkpointStart)
		+ plugin.scoreCycleTimes.formatRow(now, 'Next CP', checkpointEnd, 'next-cp')
		+ plugin.scoreCycleTimes.formatRow(now, 'Cycle e.', cycleEnd)
		+ '</table>'
	;

	$('#score_cycle_times_display').html(html);

	$('#score_cycle_times_display .next-cp').click(function() {
		plugin.scoreCycleTimes.showCheckpointsDialog(checkpointEnd, cycleStart, cycleEnd, checkpointLength);
	});
	$('#score_cycle_times_display .next-cp .val')
		.append(' <span style="cursor:pointer" title="Show remaining checkpoints">[...]</span>')
	;

	var closestDeltaT = (checkpointEnd - now) / 1000 / 60;	// that should be closest
	setTimeout ( window.plugin.scoreCycleTimes.update, updateInterval(closestDeltaT));
};

/**
 * Show remaining checkpoints.
 */
window.plugin.scoreCycleTimes.showCheckpointsDialog = function (checkpointEnd, cycleStart, cycleEnd, checkpointLength) {
	var now = new Date().getTime();
	var html = '<table>';
	for (var checkpoint = checkpointEnd; checkpoint < cycleEnd; checkpoint+=checkpointLength) {
		var checkpointNumber = Math.floor((checkpoint-cycleStart)/checkpointLength);
		html += plugin.scoreCycleTimes.formatRow(now, '#'+checkpointNumber, checkpoint);
	}
	html += '</table>';

	dialog({
		html: html,
		dialogClass: 'ui-dialog-scoreCycleTimes',
		title: 'Remaining checkpoints'
	});
};



var setup =  window.plugin.scoreCycleTimes.setup;

// PLUGIN END //////////////////////////////////////////////////////////


setup.info = plugin_info; //add the script info data to the function as a property
if(!window.bootPlugins) window.bootPlugins = [];
window.bootPlugins.push(setup);
// if IITC has already booted, immediately run the 'setup' function
if(window.iitcLoaded && typeof setup === 'function') setup();
} // wrapper end
// inject code into site context
var script = document.createElement('script');
var info = {};
if (typeof GM_info !== 'undefined' && GM_info && GM_info.script) info.script = { version: GM_info.script.version, name: GM_info.script.name, description: GM_info.script.description };
script.appendChild(document.createTextNode('('+ wrapper +')('+JSON.stringify(info)+');'));
(document.body || document.head || document.documentElement).appendChild(script);
