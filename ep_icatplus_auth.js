// Copyright 2021 Alejandro de Maria <demariaa@esrf.fr>
//
// @License MIT

//var LdapAuth = require('ldapauth');
var MyLdapAuth = require("./lib/MyLdapAuth.js");
var util = require("util");
var fs = require("fs");
const axios = require("axios-https-proxy-fix");

var ERR = require("async-stacktrace");
var settings = require("ep_etherpad-lite/node/utils/Settings");
var authorManager = require("ep_etherpad-lite/node/db/AuthorManager");

const { server } = settings.users.icatplus;

function ldapauthSetUsername(token, username) {
  authorManager.setAuthorName(username, username);
  return;
}

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

  const url = server + "/session/" + sessionID;

  axios
    .get(url)
    .then((response) => {
      const { userName, user } = response.data;

      if (!userName) throw "No user name";

      context.req.session.user = {
        username: userName,
        authorID: userName,
        is_admin: user.isAdministrator === "true",
        sessionID: context.req.query.sessionID,
        padName: context.req.query.padName,
      };
      console.log("User is authenticated", {
        userName,
        isAdministrator: user.isAdministrator,
        isInstrumentScientist: user.isInstrumentScientist,
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
 * It means that checks if the user is participant or manager or the pad is not under embargo
 * @param {*} hook_name
 * @param {*} context
 * @param {*} cb
 * @returns
 */
exports.authorize = function (hook_name, context, cb) {
  const { username, authorID, sessionID, padName } = context.req.session.user;
  console.log("Authorize", {
    hook_name,
    username,
    authorID,
    sessionID,
    padName,
  });
  const url =
    server + "/logbook/" + sessionID + "/event?investigationId=" + padName;
  console.log(url);
  axios
    .get(url)
    .then((response) => {
      console.log(response.status);

      if (response.status == 200) {
        return cb([true]);
      }
      return cb([false]);
    })
    .catch((e) => {
      console.log("Error produced on authenticate", { e });
      console.log(e);
      return cb([false]);
    });
};

exports.handleMessage = function (hook_name, context, cb) {
  console.debug("222 ep_ldapauth.handleMessage");

  if (context.message.type == "CLIENT_READY") {
    if (!context.message.token) {
      console.debug(
        "ep_ldapauth.handleMessage: intercepted CLIENT_READY message has no token!"
      );
    } else {
      var client_id = context.client.id;
      if ("user" in context.client.client.request.session) {
        var displayName =
          context.client.client.request.session.user.displayName;
        if (settings.users.ldapauth.anonymousReadonly && !displayName)
          displayName = "guest";
        console.debug(
          "ep_ldapauth.handleMessage: intercepted CLIENT_READY message for client_id = %s, setting username for token %s to %s",
          client_id,
          context.message.token,
          displayName
        );
        ldapauthSetUsername(context.message.token, displayName);
      } else {
        console.debug(
          "ep_ldapauth.handleMessage: intercepted CLIENT_READY but user does have displayName !"
        );
      }
    }
  } else if (
    context.message.type == "COLLABROOM" &&
    context.message.data.type == "USERINFO_UPDATE"
  ) {
    console.debug(
      "ep_ldapauth.handleMessage: intercepted USERINFO_UPDATE and dropping it!"
    );
    return cb([null]);
  }
  return cb([context.message]);
};

// vim: sw=2 ts=2 sts=2 et ai
