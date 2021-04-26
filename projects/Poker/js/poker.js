// Entry point.        
function init() {
    // define our paytable
    var pay_table =
    {
        royal_flush: { hand: "ROYAL FLUSH", pays: [250, 500, 750, 1000, 4000] },
        straight_flush: { hand: "STRAIGHT FLUSH", pays: [90, 180, 270, 360, 450] },
        quads: { hand: "4 OF A KIND", pays: [25, 50, 75, 100, 125] },
        full_house: { hand: "FULL HOUSE", pays: [9, 18, 27, 36, 45] },
        flush: { hand: "FLUSH", pays: [6, 12, 18, 24, 30] },
        straight: { hand: "STRAIGHT", pays: [4, 8, 12, 16, 20] },
        trips: { hand: "3 OF A KIND", pays: [3, 6, 9, 12, 15] },
        two_pair: { hand: "TWO PAIR", pays: [2, 4, 6, 8, 10] },
        pair: { hand: "JACKS OR BETTER", pays: [1, 2, 3, 4, 5] }
    };
    // generate the HTML from the paytable
    var pt_keys = Object.keys(pay_table);
    var table = document.querySelector('#paytable');
    var table_html = "";
    // build the rest of the rows
    for (var i = 0; i < pt_keys.length; ++i) {
        var entry = pay_table[pt_keys[i]];
        table_html += table.innerHTML.replace('HAND', entry.hand).replace('ROW', pt_keys[i])
            .replace('BET1', entry.pays[0]).replace('BET2', entry.pays[1]).replace('BET3', entry.pays[2])
            .replace('BET4', entry.pays[3]).replace('BET5', entry.pays[4]);
    }
    table.innerHTML = table_html;

    var rng = createRNG();

    // create our state machine
    var states = {
        idle: { allow_hold: false, deal_text: "DEAL", instr_text: "<p>Press 'DEAL' to begin</p>", allow_deal: true, allow_bet: true },
        animate_deal: { allow_hold: false, deal_text: "DEAL", instr_text: "<p>Press 'DEAL' to begin</p>", allow_deal: false, allow_bet: false },
        hand: { allow_hold: true, deal_text: "DRAW", instr_text: "<p>Select cards to hold and press 'DRAW'</p>", allow_deal: true, allow_bet: false },
        animate_draw: { allow_hold: false, deal_text: "DEAL", instr_text: "<p>Select cards to hold and press 'DRAW'</p>", allow_deal: false, allow_bet: false },
        evaluate: { allow_hold: false, deal_text: "DEAL", instr_text: "", allow_deal: true, allow_bet: false },
        check_balance: { allow_hold: false, deal_text: "DEAL", instr_text: "<p>Insert Credits to Play</p>", allow_deal: false, allow_bet: false }
    };
    var state_machine = createStateMachine(states);

    // create our evaluator
    var evaluator = createEvaluator();
    // cache a pointer to the cards
    var cards = document.querySelectorAll('.flex-card');
    // create card click callbacks
    var toggle = { hidden: 'visible', visible: 'hidden' };
    for (var i = 0; i < cards.length; ++i) {
        
        cards[i].onclick = function () {
            if (state_machine.getValue('allow_hold') == true) {
                var child = this.children[0];
                child.style.visibility = toggle[child.style.visibility];
            }
        };
    }

    // cache some things for good measure
    var deal = document.querySelector('#deal_button');
    var bet_button = document.querySelector('#bet_button');
    var instr = document.querySelector('#instructions');

    // register a generic callback with the state machine to handle everytime the state changes
    state_machine.registerStateChangedCallback(function (state) {
        deal.innerHTML = state.deal_text;
        instr.innerHTML = state.instr_text;

        $('#deal_button').removeClass('disabled');
        $('#deal_button').prop('disabled', false);
        $('#bet_button').removeClass('disabled');
        $('#bet_button').prop('disabled', false);
        if (state.allow_deal == false) {
            deal.classList.add("disabled");
            $('#deal_button').addClass('disabled');
            $('#deal_button').prop('disabled', true);
        }
        if (state.allow_bet == false) {
            $('#bet_button').addClass('disabled');
            $('#bet_button').prop('disabled', true);                 
        }
    });
    // register all the state specific callbacks
    state_machine.registerCallback('animate_deal', stateAnimateDeal);
    state_machine.registerCallback('animate_draw', stateAnimateDraw);
    state_machine.registerCallback('evaluate', stateEvaluate);
    state_machine.registerCallback('check_balance', stateCheckBalance);

    // set the bet amount
    function createBet() {
        var value = 0;
        var bet_amount = document.querySelector('#bet_button');
        var bet = {
            setWin: function(_win) {
                var tr = document.querySelectorAll('.pay_table_win');
                for (var i = 0; tr != undefined && i < tr.length; ++i) {
                    tr[i].classList.remove('pay_table_win');
                }
                tr = document.querySelector('#' + _win);
                if (tr != undefined) {
                    tr.children[0].classList.add('pay_table_win');
                    if (tr.children[value] != undefined) {
                        tr.children[value].classList.add('pay_table_win');
                    }
                }
            },
            setBet: function(_bet) {
                if (value !== _bet) {
                    value = _bet;
                    // clear the old highlight
                    var cols = document.querySelectorAll('.pay_table_selected');
                    for (var i = 0; cols != undefined && i < cols.length; ++i) {
                        cols[i].classList.remove("pay_table_selected");
                    }
                    // set the new highlight
                    cols = document.querySelectorAll('.bet' + value);
                    for (i = 0; cols != undefined && i < cols.length; ++i) {
                        cols[i].classList.add("pay_table_selected");
                    }
                    bet_amount.innerHTML = "BET " + value;
                }
            },
            getValue: function() { return value; }
        };
        return bet;
    };
    var bet = createBet();
    bet.setBet(5); // initiatlize with 5
    document.querySelector('#bet_button').onclick = function () {
        var state = state_machine.getState();
        if (state.allow_bet) {
            var bet_value = bet.getValue() + 1;
            if (bet_value > 5)
                bet_value = 1;
            bet.setBet(bet_value);
            //animateButton ('#bet_button');
        }
    };

    // create a bank
    var bank = createBank();
    // create a credit handler
    function installCreditHandler() {
        var callback_handle = 0;
        var frames_rollup = 20;
        var old_value = 0;
        var credit_meter = document.querySelector('#credits');
        bank.registerCallback(rollup);

        function rollup(balance) {
            if (balance <= old_value) {
                credit_meter.innerHTML = 'CREDITS ' + balance;
                old_value = balance;
                clearTimeout(callback_handle);
            }
            else {// else rollup
                var rollup_value = old_value;
                var inc = Math.max(Math.floor((balance - old_value) / 20), 1);

                function callback() {
                    rollup_value = Math.min(rollup_value + inc, balance);
                    credit_meter.innerHTML = 'CREDITS ' + rollup_value;
                    (rollup_value != balance) ? callback_handle = window.setTimeout(callback, 100) :
                        old_value = balance;
                }
                window.setTimeout(callback, 100);
            }
        }
    };
    installCreditHandler();
    bank.deposit(1000);// seed with 1000 credits

    // handle the deal button presses
    deal.onclick = function () {
        var state = state_machine.getState();
        if (state.allow_deal === true) {
            console.log("Deal button clicked");
            state_machine.advanceState();
        }
    };

    // handle animate deal state ------------------------------------
    var win_value = document.querySelector('#win');
    var table_rows = document.querySelectorAll('#paytable tr');
    var win_message = document.querySelector('#win_message');
    function stateAnimateDeal() {
        win_value.innerHTML = "WIN";
        win_message.innerHTML = "";

        for (var i = 0; i < table_rows.length; ++i) {
            table_rows[i].className = table_rows[i].className.replace(" win", "");
        }
        bank.withdraw(bet.getValue());
        bet.setWin('none'); // reset the win
        picks = rng.draw(5);
        setCards({
            card1: picks[0], card2: picks[1], card3: picks[2], card4: picks[3],
            card5: picks[4]
        });
        
        // clear the holds
        for (var i = 0; i < cards.length; ++i) {
            var child = cards[i].children[0];
            child.style.visibility = 'hidden';
        }
    }

    // handle the animate draw state ---------------------------------
    function stateAnimateDraw() {
        var draw_cards = {};
        for (var i = 0; i < cards.length; ++i) {
            var child = cards[i].children[0];
            if (child.style.visibility == 'hidden') {
                console.log("draw card " + i);
                var draw = rng.draw(1)[0];
                draw_cards['card' + (i + 1)] = draw;
                picks[i] = draw;
            }
        }
        setCards(draw_cards);
    }

    // handle the evaluate state
    function stateEvaluate() {
        var results = evaluator.evaluate(picks);
        var win = pay_table[results.win_type];
        if (win != undefined) {
            // if a pair make sure we are jacks or better
            var val = Number(results.wins[0].slice(1));
            if (results.win_type != 'pair' || (val > 10 || val == 1)) {
                bet.setWin(results.win_type);
                bank.deposit(win.pays[bet.getValue() - 1]);
                win_value.innerHTML = 'WIN ' + win.pays[bet.getValue() - 1];
                win_message.innerHTML = win.hand;
                // clear the holds
                for (var i = 0; i < cards.length; ++i) {
                    var child = cards[i].children[0];
                    child.style.visibility = 'hidden';
                }
            }
        }
        state_machine.advanceState();
    }

    // check balance before continuing
    function stateCheckBalance() {
        if (bank.getBalance() - bet.getValue() > 0) {
            state_machine.advanceState();
        }
    }

    // set the cards to the class that will make them show the correct image
    // do this in nice way with a IGT animation style (show the back and then the face in sequential order)
    function setCards(_card_info) {
        var time_out = 50, index = 0, cards_info = new Object(_card_info); // get our own copy
        var keys = Object.keys(cards_info), state = 0;
        // animation function
        window.setTimeout(animateCards, time_out);
        function animateCards() {
            var style, key = keys[index], card = cards_info[key];
            (state == 0) ? style = "card-img-top card-sprite back" : style = "card-img-top card-sprite " + card;
            for (var i = 0; i < cards.length; ++i) {
                if (cards[i].id == key) {
                    cards[i].children[1].children[0].className = style;
                    break;
                }
            }
            if (++index >= keys.length) {
                index = 0;
                ++state;
            }
            (state < 2) ? window.setTimeout(animateCards, time_out) : state_machine.advanceState();
        }
    }
}

// Creat an poker RNG. This picks cards from a single deck. Calling shuffle resets the deck
function createRNG ()
{
    function getRandomInt (range){
        return Math.floor(Math.random()*(range));
    }

    Array.prototype.shuffle = function() {
        var i = this.length, j, temp;
        if (i == 0) return this;
        while (--i) {
            j = Math.floor(Math.random() * (i + 1));
            temp = this[i];
            this[i] = this[j];
            this[j] = temp;
        }
        return this;
    };
    // map the cards to ints
    var cards = ['C1','C2','C3','C4','C5','C6','C7','C8','C9','C10','C11','C12','C13',  // c1 - club ace, c13 - club king
                 'D1','D2','D3','D4','D5','D6','D7','D8','D9','D10','D11','D12','D13',  // d1 - diamond ace,
                 'H1','H2','H3','H4','H5','H6','H7','H8','H9','H10','H11','H12','H13',  // h1 - heart ace
                 'S1','S2','S3','S4','S5','S6','S7','S8','S9','S10','S11','S12','S13']; // s1 - spade ace
    var rng = 
    {              
        draw: function (count) {
        
            var shuffled_cards = cards.shuffle();
            var cur_picks = shuffled_cards.slice(0, count);
            return cur_picks;
        }              
    };
    return rng;
}

// This will create states each with two properties. Properties can be added dynamically 
function createStateMachine(states) {
    var state_keys = Object.keys(states);
    var cur_state = states[state_keys[0]];
    var state_changed_callbacks = [];
    // link the states
    var last_index = state_keys.length - 1;
    for (var i = 0; i < last_index; ++i) {
        states[state_keys[i]].name = state_keys[i];
        states[state_keys[i]].next = states[state_keys[i + 1]];
    }
    states[state_keys[last_index]].next = states[state_keys[0]];
    states[state_keys[last_index]].name = state_keys[last_index];
    // define our funcs
    var state_machine = {
        getValue: function (key, state) { // state is optional, uses cur state if not specified
            return (state != undefined) ? states[state][key] : cur_state[key];
        },
        setValue: function (key, value, state) { // state is optional, uses cur state if not specified
            (state = !undefined) ? states[state][key] = value : cur_state[key] = value;
        },
        advanceState: function () { // advance us to the next state in states object
            cur_state = cur_state.next;
            console.log ("current state:" + cur_state.name);
            for (var i = 0; i < state_changed_callbacks.length; ++i) {
                state_changed_callbacks[i](cur_state);
            }
            var calls = cur_state.callbacks; // cache because for loop might cause this func to be re-enterent
            if (calls != undefined) {
                for (var i = 0; i < calls.length; ++i) {
                    calls[i](cur_state);
                }
            }
        },
        getState: function () { // get the current state (as an object. States name is in the name field)
            return cur_state;
        },
        setState: function (state) { // set the current state (by name)
            cur_state = states[state];
        },
        registerCallback: function (state, func) { // regster a callback on a state (callback gets called when state enters) 
            if (states[state].callbacks == undefined) {
                states[state].callbacks = [];
            }
            states[state].callbacks.push(func);
        },
        registerStateChangedCallback: function (func) { // register a callback that fires everytime a state change occurs
            state_changed_callbacks.push(func);
        }
    };
    return state_machine;
}

// Evaluate the hand and determine what it is, how much it pays, and a appropriate text string for the player
function createEvaluator() {
    var suite_table = { C: 2, D: 3, H: 5, S: 7 };
    var value_table = [0, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59]; //ace - king  (0 is place holder ace = 1)                                     
    var flush_table = { 32: true, 243: true, 3125: true, 16807: true };
    var royal_straight = 69516337;
    var straight_table = {
        1062347: true, 2800733: true, 6678671: true, 14535931: true, 31367009: true,
        58642669: true, 95041567: true, 162490421: true, 259106347: true, 69516337: true
    };
    var win_table = {
        2: "flush", 3: "straight", 5: "straight", 6: "straight_flush", 30: "royal_flush",
        13: "pair", 169: "two_pair", 17: "trips", 221: "full_house", 19: "quads"
    };

    var evaluator = {
        evaluate: function (_picks) { // takes in an array of cards strings
            // use prime numvers so we can detect unique combinations
            var suite_product = 1, value_product = 1;
            var win_type = "none";
            var winning_cards = [];
            // convert the cards to prime numbers
            for (var i = 0; i < _picks.length; ++i) {
                suite_product *= suite_table[_picks[i].charAt(0)];
                value_product *= value_table[Number(_picks[i].slice(1))];
            }
            // see if we have a flush
            var flags = (flush_table[suite_product] == true) ? 2 : 1; // 2 is flush 
            flags *= (straight_table[value_product] == true) ? 3 : 1; // 3 is straight
            flags *= (value_product == royal_straight) ? 5 : 1        // 5 is a royal straight
            // now find out what kind of straight/flush we have
            if (flags != 1) {
                win_type = win_table[flags];
                winning_cards = _picks;
            }
            else { // else we dont have a straight or flush, check for of-a-kinds
                var win_values = [];
                flags = 1;
                var of_a_kind_primes = [7, 11, 13, 17, 19];// get some primes so we can tell the different type of wins apart
                for (var i = 1; i < value_table.length; ++i) {
                    var test = value_table[i];
                    var count = 0;
                    while (value_product % test === 0) {
                        test *= value_table[i];
                        ++count;
                    }
                    if (count > 1) {
                        win_values.push(i);
                        flags *= of_a_kind_primes[count]; // 13=pair, 169=2pair, 17=trips, 221=fullhouse, 19=quads
                        count = 0;
                    }
                }
                // we have some of-a-kinds, find out what kind and what the cards are
                if (flags > 1) { // if we have some sort of match
                    win_type = win_table[flags];
                    // determine winning cards
                    for (var i = 0; i < win_values.length; ++i) {
                        for (var j = 0; j < _picks.length; ++j) {
                            if (win_values[i] == Number(_picks[j].slice(1))) {
                                winning_cards.push(_picks[j]);
                            }
                        }
                    }
                }
            }
            console.log("Picks: " + _picks);
            console.log("Win_type: " + win_type + ", Win: " + winning_cards);
            return { win_type: win_type, wins: winning_cards };
        }
    };
    return evaluator;
}

//handle money
function createBank() {
    var balance = 0;
    var callbacks = [];
    function callCallbacks() {
        for (var i = 0; i < callbacks.length; ++i) {
            callbacks[i](balance);
        }
    }
    var bank = {
        withdraw: function (amount) {
            var success = false;
            if (balance - amount >= 0) {
                balance -= amount;
                callCallbacks();
                success = true;
            }
            return success;
        },
        deposit: function (amount) {
            balance += amount;
            callCallbacks();
        },
        getBalance: function () {
            return balance;
        },
        registerCallback: function (callback) {
            callbacks.push(callback);
        }
    };
    return bank;
}

