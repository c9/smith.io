smith.io
========

An [engine.io](https://github.com/LearnBoost/engine.io) based transport layer using
[Smith](https://github.com/c9/smith) for data encoding. Can be used as a socket.io replacement.

Features:

  * WebSockets by default with long-poll fallback
  * Automatic reconnect
  * Message buffering until reconnect timeout
  * Cross-domain support
  * Multiple connections
  * `requirejs` compatible browser client module
  * `architect` compatible server plugin
  * All major browsers supported


Usage
=====

See: `./demo`


Contribute
==========

Development Setup:

    npm install
    cd demo
    npm install
    node server
    open http://localhost:8080/

Testing:

    npm test

Debugging:

    Plugin Config ~ {
        debug: true
    }
    
    (function() { require(["smith.io"], function (TRANSPORT) { TRANSPORT.setDebug(true, ["message", "engine.io"]); }); })()
    (function() { require(["smith.io"], function (TRANSPORT) { TRANSPORT.setDebug(false); }); })()
    
    # Reload Browser


License
=======

The MIT License

Copyright (c) 2012 ajax.org B.V

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
