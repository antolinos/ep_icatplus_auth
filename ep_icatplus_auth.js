// Copyright 2021 Alejandro de Maria <demariaa@esrf.fr>
//
// @License MIT

const axios = require("axios-https-proxy-fix");
var settings = require("ep_etherpad-lite/node/utils/Settings");

const { server } = settings.users.icatplus;

exports.authenticate = function (hook_name, context, cb) {
  const { server } = settings.users.icatplus;

  console.log("Authentication", {
    hook_name,
    sessionID: context.req.query.sessionID,
    padName: context.req.query.padName,
    server,
  });

  const { sessionID, padName } = context.req.query;

  if (!sessionID) {
    console.log("No sessionID");
    return cb([false]);
  }

  if (!padName) {
    console.log("No padName");
    return cb([false]);
  }

  const instance = axios.create({
    baseURL: server,
  });

  instance
    .get(`/session/$sessionID`)
    .then((response) => {
      const { userName, user } = response.data;

      console.log("Login done", { userName, user });

      if (!userName) {
        console.warn(`ep_icatplus_auth.authenticate: Failed authentication from IP ${context.req.ip}`);
        return cb([false]);
      }

      console.info(`ep_icatplus_auth.authenticate: Successful authentication from IP ${context.req.ip} for user ${userName}`);

      const users = context.users;
      if (!(userName in users)) users[userName] = {};
      users[userName].username = userName;

      context.req.session.user = {
        username: userName,
        name: user.fullName,
        displayName: user.fullName,
        authorID: userName,
        is_admin: user.isAdministrator === "true",
        sessionID: context.req.query.sessionID,
        padName: context.req.query.padName,
        // readOnly: false,
      };

      //TODO: authorManager.setAuthorName(userName, user.fullName);
      console.log("User is authenticated", {
        userName,
        fullName: user.fullName,
        isAdministrator: user.isAdministrator,
        isInstrumentScientist: user.isInstrumentScientist,
        displayName: userName,
      });
      return cb([true]);
    })
    .catch((e) => {
      console.log("Error produced on authenticate", { e });
      console.log(e);
      return cb([false]);
    });
};

/**
 * Does the user authenticated with the sessionId has the right on the pad
 * It checks if the user is participant/manager or the pad is not under embargo
 * @param {*} hook_name
 * @param {*} context
 * @param {*} cb
 * @returns
 */
exports.authorize = function (hook_name, context, cb) {
  const { username, authorID, sessionID, padName, name, displayName } = context.req.session.user;
  console.log("Authorize", {
    hook_name,
    username,
    authorID,
    sessionID,
    padName,
    name,
    displayName,
  });

  const instance = axios.create({
    baseURL: server,
  });

  instance
    .get(`/logbook/${sessionID}/event?investigationId=${padName}`)
    .then((response) => {
      if (response.status == 200) {
        console.log("Autorized " + displayName);
        context.req.session.user["displayName"] = displayName;

        return cb([true]);
      }
      console.log("Unautorized");
      return cb([false]);
    })
    .catch((e) => {
      console.log("Error produced on authenticate", { e });
      console.log(e);
      return cb([false]);
    });
};

exports.handleMessage = function (hook_name, context, cb) {
  let { message } = context;

  if (context.message.type == "CLIENT_READY") {
    if (message && message.userInfo && message.userInfo.name) {
      message.userInfo.name = context.client.client.request.session.user.displayName;
    }
  }

  /** This prevents update userinfo */
  if (context.message.type == "USERINFO_UPDATE") {
    return cb([null]);
  }

  return cb([context.message]);
};
