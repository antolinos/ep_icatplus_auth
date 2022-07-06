# Etherpad lite ICAT+ authentication and authorization

## Install

In your etherpad-lite dir:

    npm install ep_icatplus_auth

Add to settings.json:

```
"users": {
    "icatplus": {
        "server": "https://icatplus.server.com"
    },
}
```

Users who are which have access to the logbook of the padName will have access to the pad

## Integration

It is supposed to be used inside an iframe:

```
 <iframe
              title="Report Auth"
              src={`http://localhost:9001/auth_session?sessionID=${user.sessionId}&padName=${investigationId}`}
              width="100%"
              height={window.innerHeight}
              frameBorder="0"
            ></iframe>
```
