exports.setApp = function(app,
  getUserIdFromToken,
  readDocument, writeDocument)

  {

    function getUserData(userId){
      var user =  readDocument('users', userId);
      user.blockedUsers = user.blockedUsers.map(getBlockedUserSync);
      var userData = {
        user : user
      };
      return userData;
    }
    app.get('/user/:userid', function(req, res) {
      var userid = req.params.userid;
      var fromUser = getUserIdFromToken(req.get('Authorization'));
      var useridNumber = parseInt(userid, 10);
      if (fromUser === useridNumber) {
        res.send(getUserData(useridNumber));
      } else {
        res.status(401).end();
      }
    });


    function getBlockedUserSync(userId) {
      var blocked = readDocument('users',userId);
      return blocked;
    }

    function updateUserData(userId,user, username, gender, password, blocked, email, emailset, image){
      var userData = readDocument('users', userId);
      userData.username = username;
      userData.gender = gender;
      userData.password = password;
      userData.blockedUsers = blocked;
      userData.email = email;
      userData.emailset = emailset;
      userData.image = image;
      writeDocument('users', userData);
      return userData;
    }

    app.put('/user/:userid/', function(req, res) {
      console.log(req);
      var userid = req.params.userid;
      var fromUser = getUserIdFromToken(req.get('Authorization'));
      var useridNumber = parseInt(userid, 10);
      if (fromUser === useridNumber) {
        var userData = req.params;
        console.log(userData);
        var ret = updateUserData(useridNumber, userData.username, userData.gender, userData.password, userData.blockedUsers, userData.email, userData.emailset, userData.image);
        console.log(ret);
        res.send(ret);
      } else {
        res.status(401).end();
      }
    });

    function unBlock(user , blockedUser){
      var userData = readDocument('users', user);
      var index = userData.blockedUsers.indexOf(blockedUser);
      userData.blockedUsers.splice(index, 1);
      writeDocument('users', userData);
      return userData;
    }

    app.delete('/user/:id/blockedusers/:userid', function(req, res) {
      var fromUser = getUserIdFromToken(req.get('Authorization'));
      // Convert from a string into a number.
      var id = parseInt(req.params.id, 10);
      var userId = readDocument('users', id);
      var blockedUserId = getBlockedUserSync(userId);
      // Check that the author of the post is requesting the delete.
      if (id === fromUser) {
        var unBlocked = unBlock(userId, blockedUserId);
        //send update user back
        res.send(unBlocked);
      } else {
        // 401: Unauthorized.
        res.status(401).end();
      }
    });

  };
