var xmpp = require('node-xmpp');

// http://xmpp.org/extensions/xep-0160.html
exports.name = "presence";

function Presence(client) {
    client.on('stanza', function(stanza) {
        if (stanza.is('presence')) {
            // Ok, now we must do things =)
            if (!stanza.attrs.to && !stanza.attrs.type) {
                // Section 5.1.1 in http://xmpp.org/rfcs/rfc3921.html#presence
                if(!client.initial_presence_sent) {
                    client.initial_presence_sent = true;
                    if(client.roster) {
                        client.roster.subscriptions(["to", "both"], function(jids) {
                            jids.forEach(function(jid) {
                                stanza.attrs.type = "probe";
                                stanza.attrs.to = jid;
                                client.c2s.router.send(stanza); // TODO: Blocking Outbound Presence Notifications.
                            });
                        });
                        client.roster.subscriptions(["from", "both"], function(jids) {
                            jids.forEach(function(jid) {
                                stanza.attrs.to = jid;
                                client.c2s.router.send(stanza); // TODO: Blocking Outbound Presence Notifications.
                            });
                        });
                    }
                    // Send the presence to the other resources for this jid, if any.
                    client.c2s.connectedClientsForJid(stanza.attrs.from).forEach(function(jid) {
                        if(client.jid.resource != jid.resource) {
                            stanza.attrs.to = jid.toString();
                            client.c2s.router.send(stanza); // TODO: Blocking Outbound Presence Notifications.
                        }
                    })
                }
                // Section 5.1.2 in http://xmpp.org/rfcs/rfc3921.html#presence
                if((!stanza.attrs.type || stanza.attrs.type === "unavailable") && client.initial_presence_sent) {
                    if(client.roster) {
                        client.roster.subscriptions(["from", "both"], function(jids) {
                            jids.forEach(function(jid) {
                                stanza.attrs.to = jid;
                                client.c2s.router.send(stanza); // TODO: Blocking Outbound Presence Notifications.
                            });
                        });
                    }
                }
            }
        }
    });
    
    client.on('disconnect', function() {
        // We need to send a <presence type="offline" > on his behalf
        var stanza = new xmpp.Element('presence', {from: client.jid.toString(), type: "unavailable" });
        client.c2s.connectedClientsForJid(client.jid.toString()).forEach(function(jid) {
            if(client.jid.resource != jid.resource) {
                stanza.attrs.to = jid.toString();
                client.c2s.router.send(stanza); // TODO: Blocking Outbound Presence Notifications.
            }
        });
    });
    
}

exports.mod = Presence;

