/*
 * Slack Shared Library
 *
 * This shared library is for interacting with Slack to create a channel, retrieve channel history, and to get user info. 
 * This library has been modified from the upstream project https://github.com/xmatters/xm-labs-slack project
 *  The modified library can be found here: https://github.com/MartelliAtPythian/xm-labs-slack
 */
 
exports.createChannel = function( channelName, token ) {
    // Prepare the HTTP request
	var createPath = '/channels.create?token=' + token + '&name=' + channelName;
    var slackRequest = http.request({
        'endpoint': 'Slack',
        'method': 'POST',
        'path': createPath
    });

    var slackResponse = slackRequest.write();
    var slackBody     = JSON.parse( slackResponse.body );
    console.log( 'Slack Create Channel Response: ' + JSON.stringify( slackBody ) );
    
    // If the name is taken, then let's go
    // get the channel
    if( slackBody.error == 'name_taken' ){
        
        console.log( 'Channel "' + channelName + '" already exists. Getting info.' );
        return this.getChannel( channelName );
    }
    
    return slackBody;
};


exports.getTeam = function(token) {
    // GET https://slack.com/api/team.info
    
	var teamPath = '/team.info?token=' + token;
    var slackRequest = http.request({
        'endpoint': 'Slack',
        'method': 'GET',
        'path': teamPath
    });
    
    var slackResponse = slackRequest.write();
    var body = JSON.parse( slackResponse.body );
    if( body.ok )
      return body.team;
      
    return null;
};



exports.getChannel = function( channelName, token ) {
    var channelPath = '/channels.list?token=' + token;
    var slackRequest = http.request({
        'endpoint': 'Slack',
        'method': 'GET',
        'path': channelPath
    });
    
    var slackResponse = slackRequest.write();
    var slackBody     = JSON.parse( slackResponse.body );
    if( !slackBody.ok ){
        console.log( 'Error getting Channel list: ' + slackBody.error );
        return null;
    }
    
    console.log("Searching for " + channelName);
    
    for( var i in slackBody.channels ) {
        //console.log( 'Checking "' + i + "against " + slackBody.channels[i].name + '"' );
        if( slackBody.channels[i].name == channelName )
          return slackBody.channels[i];
    }
    console.log("Channel Not Found!");
    
    return null;
            
};



exports.archiveChannel = function( channelName, token) {

    var channel = this.getChannel( channelName );
	
	if( channel === null ) {
        console.log( 'Channel "' + channelName + '" not found.' );
        return null;
    }
	
    var channelPath = '/channels.archive?token=' + token + "&channel=" + channel.id;
    
    var slackRequest = http.request({
        'endpoint': 'Slack',
        'method': 'POST',
        'path': channelPath
    });
    
    var slackResponse = slackRequest.write();
    var slackBody     = JSON.parse( slackResponse.body );
           
    return slackBody;			   
};

exports.getRoomHistory = function( channelName, count, token, latest, oldest ){
  
    var channel = this.getChannel( channelName );
    
    if( channel === null ) {
        console.log( 'Channel "' + channelName + '" not found.' );
        return null;
    }
    
    
    var parms = '';
    parms += '&channel=' + channel.id;
    parms += ( !!count  ? '&count='  + count  : '' );
    parms += ( !!latest ? '&latest=' + latest : '' );
    parms += ( !!oldest ? '&oldest=' + oldest : '' );
    
    var channelPath = '/channels.history?token=' + token + parms; 
    var slackRequest = http.request({
        'endpoint': 'Slack',
        'method': 'GET',
        'path': channelPath
    });
    
    var slackResponse = slackRequest.write();
    var slackBody     = JSON.parse( slackResponse.body );
    if( !slackBody.ok ){
        console.log( 'Error getting Channel history: ' + slackBody.error );
        return null;
    }
    
  // This section parses the message contents into a human readable history log
    var historyLog = '';
    for( var i in slackBody.messages ) {
        if (slackBody.messages[i].type == "message") {
            var userInfo = this.getUserInfo(slackBody.messages[i].user);
            var messagePoster = userInfo.profile;
            var userRealName = messagePoster.real_name;
            var formattedTimestamp = this.unixToTimestamp(slackBody.messages[i].ts);
            historyLog = historyLog + '\n' + slackBody.messages[i].text + ' ' + formattedTimestamp + ' ' + userRealName;
        }
    }     
    return historyLog;
};

exports.getUserInfo = function( userid , token) {
    var userPath = '/users.info?token=' + token + '&user=' + encodeURIComponent( userid ); 
    var slackRequest = http.request({
        'endpoint': 'Slack',
        'method': 'GET',
        'path': userPath
    });
    
    var slackResponse = slackRequest.write();
    var slackBody     = JSON.parse( slackResponse.body );
    if( !slackBody.ok ) {
        console.log( 'Error getting user "' + userid + '"' );
        return null;
    }
    
    return slackBody.user;
    
};

exports.lookupByEmail = function( email, token ) {
    var emailPath = '/users.lookupByEmail?token=' + token + '&email=' + encodeURIComponent( email ); 
    var slackRequest = http.request({
        'endpoint': 'Slack',
        'method': 'GET',
        'path': emailPath
    });

    var slackResponse = slackRequest.write();
    var slackBody = JSON.parse( slackResponse.body );
    if( !slackBody.ok ) {
        console.log( 'Error ' + slackBody.error + ' looking up user by email "' + email + '"' );
        return null;
    }
    return slackBody.user;
};

exports.inviteToChannel = function( token, channelID, userID ) {
    var channelPath = '/channels.invite?token=' + token + '&channel=' + channelID + '&user=' + userID;
    console.log('PATH' + channelPath);
    var slackRequest = http.request({
        'endpoint': 'Slack',
        'method': 'POST',
        'path': channelPath 
    });

    var slackResponse = slackRequest.write();
    var slackBody = JSON.parse( slackResponse.body );
    
    if( !slackBody.ok ) {
        console.log( 'Error ' + slackBody.error + ' inviting to channel "' + channelID + '"' );
        return null;
    }
    return slackBody.user;
};


exports.postMessage = function( payload ) {
    
    payload.token = http.authenticate( 'Slack' );
    var qs = jsonToQueryString( payload );

    var slackRequest = http.request({
        'endpoint': 'Slack',
        'method': 'POST',
        'path': '/chat.postMessage' + qs
    });
    
    var slackResponse = slackRequest.write( payload );
    var slackBody     = JSON.parse( slackResponse.body );
    if( !slackBody.ok ) {
        console.log( 'Error posting message!' );
        return null;
    }
    
    return slackBody;
    
};

exports.unixToTimestamp = function(unixTime) {
   var date = new Date(unixTime*1000);
   return date;
};

jsonToQueryString = function(json) {
    return '?' + 
        Object.keys(json).map(function(key) {
            return encodeURIComponent(key) + '=' +
                encodeURIComponent(json[key]);
        }).join('&');
};

//