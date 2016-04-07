import { readDocument, writeDocument, addDocument, readCollection } from './database.js';

var token = 'eyJpZCI6MX0='; // <-- Put your base64'd JSON token here
/**
 * Properly configure+send an XMLHttpRequest with error handling, authorization token,
 * and other needed properties.
 */
function sendXHR(verb, resource, body, cb) {
  var xhr = new XMLHttpRequest();
  xhr.open(verb, resource);
  xhr.setRequestHeader('Authorization', 'Bearer ' + token);

  // Response received from server. It could be a failure, though!
  xhr.addEventListener('load', function() {
    var statusCode = xhr.status;
    var statusText = xhr.statusText;
    if (statusCode >= 200 && statusCode < 300) {
      // Success: Status code is in the [200, 300) range.
      // Call the callback with the final XHR object.
      cb(xhr);
    } else {
      // Client or server error.
      // The server may have included some response text with details concerning
      // the error.
      var responseText = xhr.responseText;
      console.log('Could not ' + verb + " " + resource + ": Received " + statusCode + " " + statusText + ": " + responseText);
    }
  });

  // Time out the request if it takes longer than 10,000 milliseconds (10 seconds)
  xhr.timeout = 10000;

  // Network failure: Could not connect to server.
  xhr.addEventListener('error', function() {
    console.log('Could not ' + verb + " " + resource + ": Could not connect to the server.");
  });

  // Network failure: request took too long to complete.
  xhr.addEventListener('timeout', function() {
    console.log('Could not ' + verb + " " + resource + ": Request timed out.");
  });

  switch (typeof(body)) {
    case 'undefined':
      // No body to send.
      xhr.send();
      break;
    case 'string':
      // Tell the server we are sending text.
      xhr.setRequestHeader("Content-Type", "text/plain;charset=UTF-8");
      xhr.send(body);
      break;
    case 'object':
      // Tell the server we are sending JSON.
      xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
      // Convert body into a JSON string.
      xhr.send(JSON.stringify(body));
      break;
    default:
      throw new Error('Unknown body type: ' + typeof(body));
  }
}

/**
 * Emulates how a REST call is *asynchronous* -- it calls your function back
 * some time in the future with data.
 */
function emulateServerReturn(data, cb) {
  console.log(cb);
  setTimeout(() => {
    cb(data);
  }, 4);
}

// ====================
// Thread functions
// ====================
export function createThread(author, title, date, time, desc, image, boards, cb) {
    sendXHR('POST', '/thread', {
      boards: boards,

      originalPost: {
        author: author,
        title: title,
        date: date,
        time: time,
        img: image,
        description: desc
      }
    }, (xhr) => {
       cb(JSON.parse(xhr.responseText));
     });
  }


// ====================
// Board Data Functions
//=====================
export function getBoardsData(cb){
  sendXHR('GET', '/boards/', undefined, (xhr) => {
    cb(JSON.parse(xhr.responseText));
  });
}

export function getBoardContent(boardId, cb){

  /*sendXHR('GET', '/board/' + boardId, undefined, (xhr) => { // This is the new stuff, untested. Commented out for now
    cb(JSON.parse(xhr.responseText));
  })*/
  var board = readDocument('boards', boardId);
  board.threads = board.threads.map((id) => getThreadSync(id));

  emulateServerReturn(board, cb);
}

// ====================
// User functions
// ====================

function getThreadSync(threadId) {
  var thread = readDocument('threads', threadId);
  return thread;
}

export function getThreadData(threadId, cb){
  var thread = readDocument('threads', threadId);
  var threadData = {
     contents : thread
   };
   emulateServerReturn(threadData, cb);
}

export function getRepliesData(replyId, cb){
  var reply = readDocument('replies', replyId);
  var replyData = {
    contents : reply
  }
  emulateServerReturn(replyData, cb);
}

function getReplySync(replyId) {
    var reply = readDocument('replies', replyId);

   var user = readDocument('users', reply.author);
   reply.authorUsername = user.username;
   reply.authorImage = user.image;
    reply.replies = reply.replies.map(getReplySync);
    return reply;
  }

function getFullThreadSync(threadId){
  var thread = readDocument('threads', threadId);
  var user = readDocument('users', thread.originalPost.author);
  thread.originalPost.authorUsername = user.username;
  thread.boards = thread.boards.map(getBoardSync);
  thread.replies = thread.replies.map(getReplySync);
  return thread;
}

export function getFullThreadData(threadId, cb) {
  var thread = getFullThreadSync(threadId);
   var threadData = {
     contents: thread
   };
    emulateServerReturn(threadData, cb);
  }

export function getFeedData(user, cb) {
  var userData = readDocument('users', user);
  var feedData = readDocument('feeds', userData.feed);

  feedData.contents = feedData.contents.map(getThreadSync);

  emulateServerReturn(feedData, cb);
}


export function getPinnedPostsData(user, cb) {
  var userData = readDocument('users', user);
  var pinnedPostsData = readDocument('pinnedPosts', userData.pinnedPosts);
  pinnedPostsData.contents = pinnedPostsData.contents.map(getThreadSync);
  emulateServerReturn(pinnedPostsData, cb);
}

export function deletePinnedPost(pin, thread, cb){
  var pinnedPostsData = readDocument('pinnedPosts', pin);
  var index = getIndex(pinnedPostsData.contents, thread);
  pinnedPostsData.contents.splice(index, 1);

  writeDocument('pinnedPosts', pinnedPostsData);

  emulateServerReturn(pinnedPostsData, cb);

}

function getBoardSync(boardId) {
  var board = readDocument('boards', boardId);
  return board;
}

export function getSubscribedBoardsData(user, cb) {
  sendXHR('GET', '/user/' + user + '/subscribedboards', undefined, (xhr) => {
    cb(JSON.parse(xhr.responseText));
  });
}

export function addSubscribeBoard(user, board, cb) {
  sendXHR('PUT', '/user/' + user + '/subscribedboards/' + board, undefined, (xhr) => {
    cb(JSON.parse(xhr.responseText));
  });
}

function getIndex(array, element) {
  for(var i =0; i<array.length; i++){
    if(array[i] == element){
      return i;
    }
  }
}

export function deleteSubscribeBoard(user, board, cb) {
  sendXHR('DELETE', '/user/' + user + '/subscribedboards/' + board, undefined, (xhr) => {
    cb(JSON.parse(xhr.responseText));
  });
}


function getMessageSync(message) {
  message.authorUsername = readDocument('users', message.author).username;
  return message;
}

function getConversationSync(user, conversationId) {
  var conversation = readDocument('conversations', conversationId);

  conversation.messages = conversation.messages.map(getMessageSync);

  for(var i = conversation.users.length - 1; i >= 0; i--) {
    if(conversation.users[i] === user) {
      conversation.users.splice(i, 1);
    }
  }
  conversation.user = readDocument('users', conversation.users[0]);

  return conversation;
}

function compareConversations(convA, convB) {
  // If there are no messages in the conversation, set the time of that conversation to 0.
  var timeA = convA.messages.length < 1 ? 0 : convA.messages[convA.messages.length - 1].postDate;
  var timeB = convB.messages.length < 1 ? 0 : convB.messages[convB.messages.length - 1].postDate;

  return timeB - timeA;
}

// ====================
// Conversation functions
// ====================

export function getConversationsData(user, cb) {
  sendXHR('GET', '/user/' + user + '/conversation', undefined, (xhr) => {
    cb(JSON.parse(xhr.responseText));
  });
}

export function getConversationData(user, conversationId, cb) {
  sendXHR('GET', '/user/' + user + '/conversation/' + conversationId, undefined, (xhr) => {
    cb(JSON.parse(xhr.responseText));
  });
}

export function postMessage(conversationId, author, title, contents, cb) {
  sendXHR('POST', '/user/' + author + '/conversation/' + conversationId, {
    author: author,
    title: title,
    contents: contents
  }, (xhr) => {
    // Return the new status update.
    cb(JSON.parse(xhr.responseText));
  });
}


// ====================
// Thread functions
// ====================

export function postReply(threadId, author, contents, cb){
  var thread = readDocument('threads', threadId);
  var rep = {
    'author': author,
    'postDate': new Date().getTime(),
    'contents': contents,
    'replies': []
  }
  rep = addDocument('replies', rep);
  //push current replyId to thread.replies
  thread.replies.push(rep._id);
  writeDocument('threads', thread);
  var fullThread = getFullThreadSync(threadId);
     var threadData = {
       contents: fullThread
     };
  emulateServerReturn(threadData, cb);
}

export function postReplyToReply(threadId, replyId, author, contents, cb){
  var thread = readDocument('threads', threadId);
  var reply = readDocument('replies', replyId);
  var rep = {
    'author': author,
    'postDate': new Date().getTime(),
    'contents': contents,
    'replies': []
  }
  rep = addDocument('replies', rep);
  reply.replies.push(rep._id);
  writeDocument('replies', reply);
  writeDocument('threads', thread);
  var fullThread = getFullThreadSync(threadId);
  var threadData = {
    contents: fullThread
  };
  emulateServerReturn(threadData, cb);
}

// ====================
// Search functions
// ====================

export function getSearchData(queryText, cb) {
  // userID is not needed; it's included in the JSON web token.
  sendXHR('POST', '/search', queryText, (xhr) => {
    cb(JSON.parse(xhr.responseText));
  });
}

export function getSearchDataOld(cb) {
  var threads = readCollection('threads');
  var threadData = {
    contents: []
  };

  for(var i in threads){
    var th = threads[i];

    th.boards = th.boards.map(getBoardSync);

    var userData = readDocument('users', th.originalPost.author);
    th.originalPost.authorName = userData.username;

    threadData.contents.push(th);
  }


  emulateServerReturn(threadData, cb);
}

  export function getUserData(userId, cb){
    sendXHR('GET', '/user/' + userId, (xhr) => {
      cb(JSON.parse(xhr.responseText));
    });
  }

  export function retrieveNameFromId(id ,cb) {
      var userData = readDocument('users', id);
      emulateServerReturn(userData.username, cb); //edited to include callback. These should have them to emulate server return.
    }

    export function retrievePicFromId(id) {
        var userData = readDocument('users', id);
        return userData.image;
      }

  export function updateUserData(userId,username, gender, password, blocked, email, emailset, image, cb) {
    sendXHR('PUT', '/user/' + userId, {
      username:username,
      gender:gender,
      password:password,
      blocked:blocked,
      email:email,
      emailset:emailset,
      image:image
    }, (xhr) => {
      // Return the updated user.
      cb(JSON.parse(xhr.responseText));
    });
    }



    export function unBlock(user , blockedUserId, cb){
      sendXHR('DELETE', '/user/' + user + '/blockedUsers/' + blockedUserId, undefined, () => {
        cb();
      });
    }

    export function addBlock(user, blockUser, cb) {
      var userData = readDocument('users', user);
      userData.blockedUsers.push(blockUser);
      writeDocument('users', userData);
      emulateServerReturn(userData, cb);
    }

    export function addPinnedPost(userID, threadID, cb){
      var user = readDocument('users', userID);
      var pinned = readDocument('pinnedPosts', user.pinnedPosts);
      pinned.contents.push(threadID);
      writeDocument('pinnedPosts', pinned);
      emulateServerReturn(pinned,cb); //Calls back with pinned array. Mostly for the sake of updating anything that needs to be changed on the page.
    }

    export function getPinned(userID, cb){
      var user = readDocument('users', userID);
      var pinned = readDocument('pinnedPosts', user.pinnedPosts);
      emulateServerReturn(pinned, cb); //Calls back with pinned array. Mostly for the sake of updating anything that needs to be changed on the page.

    }