
var express = require('express')
var cheerio = require('cheerio');

var querystring = require('querystring');
var app = express()
var session = require('express-session');
var MongoDBStore = require('connect-mongodb-session')(session);
const pug = require('pug');
var quip = require('./quip.js');
var jsforce = require('jsforce');
var qclient = new quip.Client({accessToken: process.env.QUIP_TOKEN});

var store = new MongoDBStore(
      {
        uri: process.env.MONGODB_URI,
        collection: 'QuipBotSessions'
      });
 
    // Catch errors 
    store.on('error', function(error) {
      //assert.ifError(error);
      //assert.ok(false);
      console.log(error);
    });

app.set('views', './views');
app.set('view engine', 'pug');

app.use('/assets', express.static(__dirname + '/node_modules/@salesforce-ux/design-system/assets'));
console.log(__dirname);
app.use(require('express-session')({
      secret: 'This is a secret',
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7 // 1 week 
      },
      store: store,
      // Boilerplate options, see: 
      // * https://www.npmjs.com/package/express-session#resave 
      // * https://www.npmjs.com/package/express-session#saveuninitialized 
      resave: true,
      saveUninitialized: true
    }));

app.get('/', function (req, res) {
res.render('home', { title: 'Hey', message: 'Hello there!' })
 // res.send('Hello World! ' + JSON.stringify(req.session))
})
//use heroku port, otherwise 3000
var port = process.env.PORT || 3000;


app.listen(port, function () {
  console.log('Quipbot listening on port ' + port)
})
var sfcon;

//
// OAuth2 client information can be shared with multiple connections.
//
var oauth2 = new jsforce.OAuth2({
  // you can change loginUrl to connect to sandbox or prerelease env.
  // loginUrl : 'https://test.salesforce.com',
  clientId : process.env.SFDC_CONSUMER,
  clientSecret : process.env.SFDC_SECRET,
  redirectUri : process.env.WHERE + '/oauth2/callback'
});
//
// Get authz url and redirect to it.
//
app.get('/oauth2/auth', function(req, res) {
  res.redirect(oauth2.getAuthorizationUrl({ scope : 'full refresh_token offline_access' }));
});


app.get('/oauth2/callback', function(req, res) {
  var conn = new jsforce.Connection({ oauth2 : oauth2 });
  var code = req.param('code');
  conn.authorize(code, function(err, userInfo) {
    if (err) { return console.error(err); }
    // Now you can get the access token, refresh token, and instance URL information.
    // Save them to establish connection next time.
    //req.session.sfdcconn = conn;
    req.session.userinfo = userInfo;
    req.session.sfdc_accessToken = conn.accessToken;
    req.session.sfdc_refreshToken = conn.refreshToken;
    req.session.sfdc_instanceUrl = conn.instanceUrl;
    console.log(conn.accessToken);
    console.log(conn.refreshToken);
    console.log(conn.instanceUrl);
    console.log("User ID: " + userInfo.id);
    console.log("Org ID: " + userInfo.organizationId);
    sfcon = conn;
    res.send('Hello World! connected to ' + conn.instanceUrl);
    // ...
  });
});

var Client = require('node-rest-client').Client;

var rclient = new Client();

var WebSocketClient = require('websocket').client;
 
var client = new WebSocketClient();
 
 var args = {
    
    headers: { "Authorization": "Bearer " + process.env.QUIP_TOKEN  } // request headers 
};
 
 var url;
 
// direct way 
rclient.get("https://platform.quip.com/1/websockets/new", args, function (data, response) {
    // parsed response body as js object 
    console.log(data);
    
    url = data;
 

 
client.on('connectFailed', function(error) {
    console.log('Connect Error: ' + error.toString());
});
 

client.on('connect', function(connection) {
    console.log('WebSocket Client Connected');
    connection.on('error', function(error) {
        console.log("Connection Error: " + error.toString());
    });
    connection.on('close', function() {
    
        //hope this is part of the Acceptable usage policy?
        console.log('echo-protocol Connection Closed');
        setTimeout(startnew, 5000);
    });
    connection.on('message', function(message) {
        if (message.type === 'utf8') {
            console.log("Received: '" + message.utf8Data + "'");
        var mess = JSON.parse(message.utf8Data);
        if(mess.type == 'message'){
        if(mess.message.text.startsWith("#")){
          console.log('bot'); 
          var thread = mess.thread.id;
          var annotation = '';
          if(mess.message.annotation){
          annotation = mess.message.annotation.id;
          }
          var records = [];
          
         // qclient.getThread(thread, function(err, threads){
          //console.log(err);
          //console.log(threads);
          //});
          
          if(mess.message.text.startsWith('#upload')){
          
          uploadtable(thread, annotation, mess.message.text);
          
          } else {
          
          queryrespond(thread, annotation, mess.message.text);
          }

          }
      //  console.log(mess.message.text);
      }
        }
    });
    
   
});

//quip expects origin to be set. 
client.connect(url.url, null, 'https://quip.com' , null , null);

});


const compiledFunction = pug.compileFile('./views/index.pug');


function uploadtable(thread, annotation, message){

    var uploadfields = [];
    var uploadData;
    
    //sobject name is in second argument
    var sobject = message.split(' ')[1];
    var $;
   
   //get the latest thread from quip
   
   qclient.getThread(thread, function(err, threads){
     $ = cheerio.load(threads.html);
     //first find the header in the table with sobject name
     $('table[title=' + sobject + ']').find('thead span').each(function(i, elem) {
       uploadfields.push($(this).text());
       //console.log($(this).text());
       });;
       //create array to store all records in
      var uploadtable = [];
      //loop trough all table rows
    $('table[title=' + sobject + ']').find('tr').each(function(i, elem) {
    
    //dont care about the header
      if(i == 0){return;} 
      //new datarow
      var datarow = {};
      
       $(this).find('span').each(function(t, elem) {
         var rowfield = {};
         //add fields to datarow
         datarow[uploadfields[t]] = $(this).text();
         //datarow.push(rowfield);
         //console.log(i + ' ' + $(this).text());

        })
       uploadtable.push(datarow);
});; 
     
     //do a bulkupdate, otherwise api gets killed
     sfcon.sobject(sobject).bulkload('update', uploadtable,
function(err, rets) {
  if (err) { return console.error(err); }
  for (var i=0; i < rets.length; i++) {
    if (rets[i].success) {
      console.log("Updated Successfully : " + rets[i].id);
    } else {
    console.log(rets);
    }
  }
});
     
   //  console.log(uploadtable);
   })
     
     
     
}

function queryrespond(thread, annotation, message){
var sobject = message.split(' ', 1)[0].substring(1);
var limit = message.split(' ', 2)[1] || 10;
var fields;
//myArray = myString.split(',');
  switch (sobject) {
   case 'case':
    fields ='Id, Subject, Status';
    break;
    case 'workorder':
     fields ='id, Subject, Status';
     break;
    default:
     fields ='Id, Name';
     }
     //yeah a where clause would be cool
  sfcon.query("SELECT " + fields + " FROM " + sobject + " LIMIT " + limit, function(err, result) {
  if (err) { 
  
     respond(thread, 'error', annotation, null);
     return console.error(err); }
  
  console.log(result);

//get rid of the attributes
for (var i = 0, len = result.records.length; i < len; i++) {

    delete result.records[i].attributes;
}
  
  //call addsection to add to spreadsheet
  addsection(thread, compiledFunction({  records: result.records, rtype: sobject}));


}
)}

function addsection(thread, message){

var newsection = {
        threadId : thread,
        content : message

    }
    console.log(newsection);
qclient.editDocument(newsection, sentedit);    
    
}
function sentedit(error, message){
  console.log('edit sent ' + error);
  console.log(message);
}

function respond(thread, message, responseto, parts){

   //parts need very specific generation, too much effort so took it out
    var newmessages = { threadId : thread , content : message, annotation_id : responseto};
   
    qclient.newMessage(newmessages, sentmessage);
}

function sentmessage(error, message){
//  console.log('message sent ' + error + message);
}

function startnew(){
client.connect(url.url, null, 'https://quip.com' , null , null);
}


