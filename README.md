architect-smith-transport
=========================

[Smith](https://github.com/c9/smith)-based transport layer (via [engine.io](https://github.com/LearnBoost/engine.io))
for [architect](https://github.com/c9/architect).

Features:

  * Architect server plugin
  * `requirejs` compatible browser client module
  * WebSockets by default with long-poll fallback
  * Automatic reconnect
  * Message buffering until reconnect timeout
  * Cross-domain support
  * Multiple connections
  * All major browsers supported (**TO BE VERIFIED**)

Development
===========

`/etc/hosts`:

    127.0.0.1 test-domain-1
    127.0.0.1 test-domain-2

Commands:

    npm install -g jamjs
    npm install
    cd demo
    npm install
    node server
    open http://localhost:8080/
