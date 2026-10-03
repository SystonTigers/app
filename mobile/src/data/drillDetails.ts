/**
 * Set-up, how it runs, coaching points and progressions for the built-in drills
 * (data/drillsData.ts), keyed by drill id. Shown on the drill page.
 */
export interface DrillDetail {
  setup: string;
  steps: string[];
  coachingPoints: string[];
  progressions: string[];
}

export const DRILL_DETAILS: Record<string, DrillDetail> = {
  "drill-001": {
    "setup": "Mark two lines of cones 20 m apart. Players spread out along one line with 2 m between each player.",
    "steps": [
      "Jog across to the far line and back to raise the heart rate.",
      "Walk across doing forward leg swings, holding a partner or cone for balance if needed.",
      "Walk across doing slow lunges, keeping the front knee over the ankle.",
      "Jog across doing high knees, then jog back easily.",
      "Jog across doing heel flicks, then jog back easily.",
      "Finish with one gentle half-pace run across and back."
    ],
    "coachingPoints": [
      "Stand tall with your chest up and eyes forward.",
      "Control every movement; swing, do not fling your legs.",
      "Land softly on the balls of your feet.",
      "Keep lunges slow and steady, front knee behind your toes.",
      "Build the pace gradually, never go flat out at the start."
    ],
    "progressions": [
      "Easier: Reduce the distance to 10 m and walk all movements.",
      "Harder: Add side leg swings, walking knee hugs and a short burst at 75% pace."
    ]
  },
  "drill-002": {
    "setup": "Mark a 20 x 20 m square with cones. Pick two taggers in bibs; everyone else spreads out inside the square.",
    "steps": [
      "On the whistle, taggers chase and try to touch players below the shoulders.",
      "A tagged player stands still with legs apart.",
      "Free players release them by crawling through their legs or giving a high five.",
      "Play 60 to 90 second rounds, then change taggers.",
      "Rest for 30 seconds between rounds."
    ],
    "coachingPoints": [
      "Keep your head up and look for space.",
      "Change direction sharply using small steps.",
      "Use feints and dummies to lose the tagger.",
      "Taggers, work together to trap players in a corner.",
      "Gentle touches only, no pushing."
    ],
    "progressions": [
      "Easier: Make the square bigger or use only one tagger.",
      "Harder: Shrink the square, add a third tagger, or give everyone a ball to dribble."
    ]
  },
  "drill-003": {
    "setup": "Set out 4 to 6 stations of cones around a 30 x 20 m area, about 5 m apart. Each player has a ball and starts at a station.",
    "steps": [
      "At each station, work for 60 seconds on the set skill.",
      "Stations include toe taps, sole rolls, inside-outside touches, drag-backs and Cruyff turns.",
      "On the whistle, dribble with the ball to the next station.",
      "Take 15 seconds to reset before starting the next skill.",
      "Complete the full circuit, then repeat the hardest two stations."
    ],
    "coachingPoints": [
      "Small, soft touches keep the ball close.",
      "Use both feet, left and right equally.",
      "Stay on the balls of your feet with knees slightly bent.",
      "Try to lift your eyes off the ball between touches.",
      "Go slowly first, then speed up once it is clean."
    ],
    "progressions": [
      "Easier: Use 30 seconds per station and simpler moves like toe taps only.",
      "Harder: Add a time challenge or call out a new move at random mid-station."
    ]
  },
  "drill-004": {
    "setup": "Players work in pairs, 8 to 10 m apart, facing each other across the pitch. One ball per pair.",
    "steps": [
      "Pass along the ground to your partner using the inside of the foot.",
      "Partner controls with one touch and passes back with the second.",
      "After 2 minutes, switch to passing with the weaker foot only.",
      "Next, control with the left and pass with the right, then swap.",
      "Finish with 1 minute of one-touch passing if accurate."
    ],
    "coachingPoints": [
      "Plant your standing foot next to the ball, pointing at your partner.",
      "Lock your ankle and strike through the middle of the ball.",
      "Call your partner's name before you pass.",
      "Open your body and cushion the first touch out of your feet.",
      "Be on your toes, ready before the ball arrives."
    ],
    "progressions": [
      "Easier: Move closer to 5 m and allow unlimited touches.",
      "Harder: Move back to 15 m, use two-touch maximum and count passes in 60 seconds."
    ]
  },
  "drill-005": {
    "setup": "Set out lines of 6 to 8 cones, 1 to 1.5 m apart. Make one line per 3 or 4 players, each with a ball.",
    "steps": [
      "First player dribbles slowly through the cones using the inside of both feet.",
      "Turn at the last cone and dribble straight back to the line.",
      "Next player goes when the first player passes the halfway cone.",
      "After each round, change the surface: outside only, then left foot only.",
      "Finish with two runs at match speed."
    ],
    "coachingPoints": [
      "Take a touch for every cone, keep the ball close.",
      "Use the inside and outside of the foot.",
      "Bend your knees and stay low to change direction.",
      "Look up between cones when you can.",
      "Speed up only when you are not hitting cones."
    ],
    "progressions": [
      "Easier: Space the cones 2 m apart and walk through first.",
      "Harder: Space cones 1 m apart, add zig-zag layouts or race another line."
    ]
  },
  "drill-006": {
    "setup": "Mark two lines of cones 20 m apart. Players stand in 3 or 4 lines on one side with 3 m between lines.",
    "steps": [
      "Jog forwards to the far line and walk back.",
      "Jog backwards carefully, looking over your shoulder.",
      "Shuffle sideways leading with the left, then the right.",
      "Skip across, driving the knee and arm together.",
      "Finish with a carioca or a jog with arm circles."
    ],
    "coachingPoints": [
      "Stay light on your feet and relaxed in the shoulders.",
      "Pump your arms in rhythm with your legs.",
      "When running backwards, check behind you.",
      "Do not cross your feet when shuffling sideways.",
      "Keep good spacing so nobody collides."
    ],
    "progressions": [
      "Easier: Shorten the distance to 10 m and walk the backwards section.",
      "Harder: Add a coach call to change direction or movement on the whistle."
    ]
  },
  "drill-007": {
    "setup": "Pairs stand 5 m apart with a cone each, one ball per pair. Spare cones mark 10 m and 15 m distances.",
    "steps": [
      "Start with gentle two-touch passes at 5 m for 2 minutes.",
      "Move back to 10 m and pass with more pace.",
      "After each pass, move a few steps sideways to a new angle.",
      "Move back to 15 m and use firm, driven passes.",
      "Return to 5 m for quick one-touch passes to finish."
    ],
    "coachingPoints": [
      "Weight the pass so it reaches your partner's feet.",
      "Move to receive; do not wait flat-footed.",
      "Open up and receive on the back foot.",
      "First touch sets up your next pass.",
      "Increase the pace gradually as the distance grows."
    ],
    "progressions": [
      "Easier: Stay at 5 m and 10 m only.",
      "Harder: Add a cone gate between pairs that the pass must go through."
    ]
  },
  "drill-008": {
    "setup": "Mark a 30 x 30 m area. Place 8 to 10 gates made of two cones 1.5 m apart scattered inside. Each player has a ball.",
    "steps": [
      "On the whistle, players dribble through as many gates as possible in 60 seconds.",
      "Score one point for each gate dribbled through.",
      "You cannot go through the same gate twice in a row.",
      "Players count their own points and share them at the end.",
      "Rest for 30 seconds, then play again and try to beat your score."
    ],
    "coachingPoints": [
      "Head up to spot the next free gate.",
      "Change direction quickly after each gate.",
      "Avoid busy gates and find space.",
      "Keep the ball close in traffic.",
      "Use different turns to get away from a gate."
    ],
    "progressions": [
      "Easier: Make gates 2.5 m wide and play without a time limit.",
      "Harder: Add 2 defenders without balls who can block gates, or narrow gates to 1 m."
    ]
  },
  "drill-009": {
    "setup": "Players stand in a circle about 15 m across, with 3 to 4 m between each player. Start with one ball.",
    "steps": [
      "Pass the ball across the circle, calling the receiver's name first.",
      "Every player must receive once before the pattern repeats.",
      "Repeat the same order until it flows smoothly.",
      "Add a second ball following the same order.",
      "Add a third ball once the group keeps both moving."
    ],
    "coachingPoints": [
      "Call the name, then pass.",
      "Check who is passing to you before the ball comes.",
      "Pass firmly along the ground.",
      "Receive across your body to set up your next pass.",
      "Stay switched on even when you do not have the ball."
    ],
    "progressions": [
      "Easier: Use one ball only and allow three touches.",
      "Harder: Use two-touch maximum and run a different pattern for the second ball."
    ]
  },
  "drill-010": {
    "setup": "Set cones at 0 m, 5 m, 10 m and 15 m in lines. Put 3 or 4 players behind each start cone.",
    "steps": [
      "Run to the 5 m cone, touch it and run back.",
      "Run to the 10 m cone, touch it and run back.",
      "Run to the 15 m cone, touch it and run back.",
      "Walk back to your line and rest while others go.",
      "Complete 4 to 6 sets, building from 70% to near full pace."
    ],
    "coachingPoints": [
      "Lower your body to turn at each cone.",
      "Push off hard with the outside leg.",
      "Short, quick steps when slowing down.",
      "Drive your arms when you accelerate.",
      "Take full rest between runs so each one is quality."
    ],
    "progressions": [
      "Easier: Use only the 5 m and 10 m cones, at a steady pace.",
      "Harder: Add a ball to dribble on the final shuttle or race a partner."
    ]
  },
  "drill-011": {
    "setup": "Make two triangles with 3 cones each, 10 m between cones. Put 1 or 2 players on each cone and one ball per triangle.",
    "steps": [
      "Player at cone A passes to the player at cone B.",
      "Player B receives across the body and passes to cone C.",
      "After passing, follow your pass to the next cone.",
      "Change direction after 3 minutes.",
      "Then play with two-touch maximum at a quicker pace."
    ],
    "coachingPoints": [
      "Receive on the back foot, open your body to the next cone.",
      "First touch out of your feet in the direction of play.",
      "Call for the ball before you receive.",
      "Pass to the receiver's back foot.",
      "Move off quickly after each pass."
    ],
    "progressions": [
      "Easier: Shorten distances to 6 to 8 m and allow free touches.",
      "Harder: One-touch only, or add a passive defender in the middle."
    ]
  },
  "drill-012": {
    "setup": "Mark a 12 x 12 m square with a cone on each corner. Put 2 to 4 players at each corner, with balls starting at two opposite corners.",
    "steps": [
      "First player on a corner with a ball passes to the next corner clockwise.",
      "Follow your pass and join the back of that line.",
      "Receiving player controls and passes on to the next corner.",
      "Keep both balls moving without catching each other.",
      "After 3 minutes, switch to anti-clockwise."
    ],
    "coachingPoints": [
      "Time your movement to arrive as the ball arrives.",
      "Open your body to face the next corner.",
      "Use the foot furthest from the passer.",
      "Firm, flat passes to the corner, not behind it.",
      "Sprint to follow your pass."
    ],
    "progressions": [
      "Easier: Use one ball only.",
      "Harder: Two-touch then one-touch only, or add a give-and-go on each side."
    ]
  },
  "drill-013": {
    "setup": "Mark a 15 x 15 m area with cones. Put 2 to 3 players on each side, with 2 balls in play.",
    "steps": [
      "Players pass to anyone on another side using one touch only.",
      "After passing, move a few steps along your side.",
      "Count the group's passes in a row without a mistake.",
      "Reset the count if a player takes two touches or the ball goes out.",
      "Play 3 rounds of 2 minutes, resting briefly between them."
    ],
    "coachingPoints": [
      "Know where the ball is going before it arrives.",
      "Set your body early, side-on to both players.",
      "Strike the middle of the ball with a firm ankle.",
      "Pass into the receiver's stride, not behind them.",
      "Call and move to give the passer an option."
    ],
    "progressions": [
      "Easier: Allow two touches and use one ball.",
      "Harder: Add a defender in the middle trying to win the ball."
    ]
  },
  "drill-014": {
    "setup": "Mark a 25 x 15 m channel. Place 3 or 4 cones as defenders or use passive players. Players in pairs with a ball.",
    "steps": [
      "Player A dribbles towards the first defender or cone.",
      "Player A passes to Player B, who is standing to one side.",
      "Player A runs past the defender into space.",
      "Player B returns the pass first time into A's path.",
      "Repeat at each defender to the end, then swap roles."
    ],
    "coachingPoints": [
      "Commit the defender before you pass.",
      "Pass and move straight away.",
      "Wall player sets the ball into space, not to feet.",
      "Accelerate past the defender after passing.",
      "Wall player angles the body to play forwards."
    ],
    "progressions": [
      "Easier: Use cones instead of defenders and a slower pace.",
      "Harder: Use live defenders, and finish with a shot on goal."
    ]
  },
  "drill-015": {
    "setup": "Pairs stand 25 to 30 m apart between two cones. One ball per pair, with pairs spaced 5 m apart.",
    "steps": [
      "Player A strikes a long pass along the ground or lofted to Player B.",
      "Player B controls the ball and returns the pass.",
      "Pass 10 times each with the stronger foot.",
      "Then pass 10 times each with the weaker foot.",
      "Move to 35 m once accurate and repeat."
    ],
    "coachingPoints": [
      "Approach the ball at a slight angle.",
      "Strike through the bottom half of the ball for height.",
      "Lean back slightly for a lofted ball.",
      "Follow through towards your target.",
      "Receiver: get in line and cushion the ball."
    ],
    "progressions": [
      "Easier: Start at 15 to 20 m and pass along the ground.",
      "Harder: Ask partners to land the ball in a 5 m target box."
    ]
  },
  "drill-016": {
    "setup": "Mark a 25 x 25 m area with 6 to 8 gates of two cones 2 m apart. Players work in pairs with one ball.",
    "steps": [
      "Pairs move around the area passing to each other.",
      "Score a point when a pass goes through a gate.",
      "Same gate cannot be used twice in a row.",
      "Play 90 second rounds, counting points.",
      "Rest for 30 seconds, then try to beat your score."
    ],
    "coachingPoints": [
      "Look up to find a free gate.",
      "Receiver: move to line up with the gate.",
      "Use the inside of the foot for accuracy.",
      "Pass firm enough to reach your partner.",
      "Talk to each other about which gate is next."
    ],
    "progressions": [
      "Easier: Widen the gates to 3 m.",
      "Harder: Narrow gates to 1 m, use two touches, or add 2 defenders."
    ]
  },
  "drill-017": {
    "setup": "Mark a 40 m channel, 20 m wide. Groups of 3 start on the end line, about 8 m apart, with the ball in the middle.",
    "steps": [
      "Middle player passes to a wide player.",
      "Passer runs behind the receiver to take their outside lane.",
      "Receiver passes back to the new middle player and runs behind.",
      "Repeat the weave pattern to the far end line.",
      "Walk back to the start and let the next group go."
    ],
    "coachingPoints": [
      "Pass in front of the runner, not behind.",
      "Follow your pass, then run behind the receiver.",
      "Keep the width in your lanes.",
      "Call for the ball when you arrive in space.",
      "Keep moving forwards at the same pace."
    ],
    "progressions": [
      "Easier: Walk through the pattern slowly first.",
      "Harder: Finish with a shot on goal at the end."
    ]
  },
  "drill-018": {
    "setup": "Pairs face each other 15 to 20 m apart. Place a 1 m cone gate halfway between them. One ball per pair.",
    "steps": [
      "Player A drives the ball firmly along the ground through the gate.",
      "Player B controls it and drives it back.",
      "Pass 10 times each with the stronger foot.",
      "Then 10 times with the weaker foot.",
      "Move to 25 m and repeat when accurate."
    ],
    "coachingPoints": [
      "Plant your standing foot next to the ball.",
      "Lock your ankle and strike the middle.",
      "Lean slightly over the ball to keep it low.",
      "Short, punchy follow-through towards the target.",
      "Receiver: get behind the ball and cushion it."
    ],
    "progressions": [
      "Easier: Shorten to 10 m and widen the gate to 2 m.",
      "Harder: One touch to control then drive within 2 touches."
    ]
  },
  "drill-019": {
    "setup": "Mark a 20 x 20 m grid. Play 5 v 2 or 6 v 3 with bibs for defenders.",
    "steps": [
      "Attackers keep possession with a two-touch maximum.",
      "Defenders press and try to win the ball.",
      "A defender who wins the ball swaps with the player who lost it.",
      "Count passes in a row; 10 passes is a point.",
      "Play 2 to 3 minute rounds, then change defenders."
    ],
    "coachingPoints": [
      "Scan before you receive the ball.",
      "Find angles so you are always available.",
      "Pass away from the pressing defender.",
      "First touch away from pressure.",
      "Keep the ball moving quickly."
    ],
    "progressions": [
      "Easier: Make the grid 25 x 25 m and allow three touches.",
      "Harder: Shrink to 15 x 15 m or allow only one touch."
    ]
  },
  "drill-020": {
    "setup": "Mark a 40 x 30 m pitch split into three lanes, with a 4 m cone goal at each end. Play 6 v 6 with bibs.",
    "steps": [
      "Teams play a normal game in the area.",
      "A goal counts double if the ball has been switched from one wide lane to the other.",
      "Coach stops play to show good switches when they happen.",
      "Play 4 to 5 minute games with short rests between.",
      "Change teams after each game."
    ],
    "coachingPoints": [
      "Head up to look for the far side.",
      "Hold width so the switch is on.",
      "Switch quickly before defenders shift across.",
      "Pass through a central player if the direct switch is blocked.",
      "Receiver: be ready to attack the space after a switch."
    ],
    "progressions": [
      "Easier: Keep defenders out of the wide lanes.",
      "Harder: Reduce the pitch width or limit midfielders to two touches."
    ]
  },
  "drill-021": {
    "setup": "Mark a 30 x 20 m area with a 3 m cone goal at one end. Players work in pairs with a ball, a full-back and a wide midfielder.",
    "steps": [
      "Full-back starts with the ball, wide midfielder 10 m ahead near the touchline.",
      "Full-back passes to the wide midfielder, then sprints round the outside.",
      "Wide midfielder dribbles inside to make space.",
      "Wide midfielder passes into the full-back's path.",
      "Full-back dribbles on and passes through the cone goal, then swap roles."
    ],
    "coachingPoints": [
      "Overlap at full speed outside the ball carrier.",
      "Shout 'overlap' so the ball carrier knows.",
      "Ball carrier drives inside to make space.",
      "Pass into space, ahead of the runner.",
      "Time the pass so the runner does not slow down."
    ],
    "progressions": [
      "Easier: Use cones for defenders and a slower run.",
      "Harder: Add a defender on the wide player to decide when to overlap."
    ]
  },
  "drill-022": {
    "setup": "Place four cones in a Y shape: a base cone, a middle cone 15 m away, and two top cones 10 m beyond. Put 2 or 3 players per cone.",
    "steps": [
      "Player at the base passes to the middle player.",
      "Middle player sets it back with one touch and spins away.",
      "Base player passes into a top cone player.",
      "Top player passes back to the middle player.",
      "Each player follows their pass to the next cone."
    ],
    "coachingPoints": [
      "Check away before showing for the ball.",
      "Open your body when you receive to see the next pass.",
      "Use one touch where possible.",
      "Pass firmly and accurately to the right foot.",
      "Move off quickly after each pass."
    ],
    "progressions": [
      "Easier: Allow two touches at every cone.",
      "Harder: Add a finish on goal after the top cone."
    ]
  },
  "drill-023": {
    "setup": "Players stand in a circle about 20 m across. Start with one ball and add a second later.",
    "steps": [
      "Pass across the circle to any teammate.",
      "Follow your pass and take the receiver's spot.",
      "Receiver controls and passes to someone else.",
      "Keep the ball moving at a steady pace.",
      "Add a second ball after 3 minutes."
    ],
    "coachingPoints": [
      "Call the receiver's name before passing.",
      "Move straight after passing.",
      "Avoid running into other players.",
      "Pass firmly along the ground.",
      "Look up before the ball reaches you."
    ],
    "progressions": [
      "Easier: Pass to the player next to you.",
      "Harder: Add a defender in the middle or play two-touch only."
    ]
  },
  "drill-024": {
    "setup": "Use half a pitch, 40 x 30 m. Put players in lines on opposite wide channels with a ball for every two players.",
    "steps": [
      "Player on one side dribbles forward a few metres.",
      "Plays a long diagonal pass to the receiver opposite.",
      "Receiver controls and dribbles forward.",
      "Receiver passes back diagonally to the next player.",
      "Swap sides after 5 minutes."
    ],
    "coachingPoints": [
      "Look up and pick your target before striking.",
      "Strike through the ball with your laces.",
      "Lean back for height, over the ball for a driven pass.",
      "Receiver: move to the ball and cushion it.",
      "Aim for the receiver's stride, not their feet."
    ],
    "progressions": [
      "Easier: Shorten the distance to 25 m.",
      "Harder: Add a defender closing down the passer to speed up decisions."
    ]
  },
  "drill-025": {
    "setup": "Set out 3 or 4 passing stations around a 40 x 30 m area. Put 3 or 4 players at each station with a ball.",
    "steps": [
      "Each station practises a different first-time pass.",
      "Use stations for give-and-go, angled first-time passes and a lay-off.",
      "Work for 4 minutes per station.",
      "Rotate clockwise when the whistle blows.",
      "Count successful first-time passes for a group score."
    ],
    "coachingPoints": [
      "Look up and decide before the ball arrives.",
      "Set your body to the target early.",
      "Use the inside of the foot for control.",
      "Keep the ankle firm through contact.",
      "Pass into space ahead of the receiver."
    ],
    "progressions": [
      "Easier: Allow a touch before the pass.",
      "Harder: Add a defender at one station or a 30 second time limit."
    ]
  },
  "drill-026": {
    "setup": "Mark a 30 x 20 m grid split into two halves. Play 5 v 5 or 6 v 6 with two neutral target players on each end line, plus a spare supply of balls with the coach.",
    "steps": [
      "Teams keep possession and try to find a target player on the end line.",
      "A pass to feet counts as one point; a pass into space a runner reaches counts as two.",
      "Runners must time movement off the shoulder before the ball is played into space.",
      "Swap target players every 3 minutes and restart from the coach after each point.",
      "Play 3 x 4-minute games with a short rest and coaching pause between."
    ],
    "coachingPoints": [
      "Look before you receive: where is the defender and where is the space?",
      "Pass to feet when the receiver is marked tight or wants to link play.",
      "Pass into space when the runner is moving and the defender is flat-footed.",
      "Weight the pass into space so the runner does not break stride.",
      "Receivers show the passer where they want it with a point or call."
    ],
    "progressions": [
      "Harder: Add a 2-touch maximum so decisions are made before the ball arrives.",
      "Harder: Add an extra defender to make spaces close faster.",
      "Easier: Add a neutral floater to create an overload in possession."
    ]
  },
  "drill-027": {
    "setup": "Mark a 45 x 30 m area split into three equal zones across its length. Play 6 v 6 or 7 v 7 with a goalkeeper or end-line target at each end.",
    "steps": [
      "Start each attack with the goalkeeper or coach passing to a player in the defensive zone.",
      "The attacking team must complete a pass in each zone before entering the final zone.",
      "Defenders may only press in the zone they start in, then release after the first pass.",
      "Score by passing to the end-line target or scoring in the goal.",
      "Play 4 x 4-minute games, rotating zones and positions between games."
    ],
    "coachingPoints": [
      "Play forward when it is on; go sideways or back to switch when it is not.",
      "Receive on the half-turn so you can see forward on your first touch.",
      "Support the ball carrier with angles, not straight lines.",
      "Speed up the passing once you break into the next zone.",
      "Midfielders check away then come short to create space to receive."
    ],
    "progressions": [
      "Harder: Allow one defender to track into the next zone after a pass.",
      "Harder: Award a bonus point for a line-breaking pass that skips a zone.",
      "Easier: Give the attacking team a neutral player who plays in every zone."
    ]
  },
  "drill-028": {
    "setup": "Mark a 20 x 20 m square with a cone gate 2 m wide in the middle. Split players into groups of 4 with one ball per group, spread around the square.",
    "steps": [
      "Players pass and move around the square, using a maximum of two touches.",
      "The first touch must control the ball out of your feet, the second is the pass.",
      "Every third pass must go through the central gate.",
      "After 3 minutes, add a second ball to each group.",
      "Finish with a 4 v 2 rondo using the same 2-touch rule."
    ],
    "coachingPoints": [
      "Open your body before the ball arrives so you can see your next pass.",
      "First touch goes into space, away from pressure.",
      "Use the inside of the foot and lock the ankle for a firm pass.",
      "Receive across your body with the back foot when you can.",
      "Keep on your toes, not your heels, ready to move after passing."
    ],
    "progressions": [
      "Harder: Switch to 1-touch passing for 1-minute bursts.",
      "Harder: Add a passive defender who becomes active after 2 minutes.",
      "Easier: Allow 3 touches and make the square 25 x 25 m."
    ]
  },
  "drill-029": {
    "setup": "Place four cones in a diamond, 12 to 15 m apart. Put 2 to 3 players on each cone, with balls starting at the bottom cone.",
    "steps": [
      "The bottom player passes to the right cone and follows the pass.",
      "The right player passes to the top cone and follows the pass.",
      "Continue round the diamond so every player passes then moves to the next cone.",
      "After 3 minutes, reverse direction to work the other foot.",
      "Then add patterns: bounce pass back to the bottom before playing to the top."
    ],
    "coachingPoints": [
      "Check away then come towards the ball to create space to receive.",
      "Receive on the back foot to open up and face the next cone.",
      "Pass firmly along the ground to the correct foot of the receiver.",
      "Call for the ball and make eye contact before passing.",
      "Follow your pass at speed; do not stand and watch."
    ],
    "progressions": [
      "Harder: Limit every player to 2 touches, then 1 touch.",
      "Harder: Run two balls at once from opposite cones.",
      "Easier: Shorten the distances to 8 to 10 m and allow unlimited touches."
    ]
  },
  "drill-030": {
    "setup": "Mark a 30 x 20 m area with a mini-gate or cone target at each end. Split into groups of 4 working in two channels, with a mannequin or cone as a defender in each channel.",
    "steps": [
      "Work through a 1-2 around the cone defender, then pass into the end gate.",
      "Next pattern: the wide player overlaps after passing inside, then receives the return pass.",
      "Next pattern: third man run, where A passes to B, B lays off to C, C plays A through.",
      "Rotate positions after each go so players learn every role.",
      "Finish with a 4 v 2 game where combinations earn bonus points."
    ],
    "coachingPoints": [
      "Pass and move instantly; the return comes quickly in a 1-2.",
      "Overlapping player calls loudly and runs outside at pace.",
      "Third man runner starts moving as the first pass is played.",
      "Lay-off passes are soft and into the runner's path.",
      "Timing of the run matters more than the speed of it."
    ],
    "progressions": [
      "Harder: Replace mannequins with live defenders who press.",
      "Harder: Insist on 1-touch for every pass in the pattern.",
      "Easier: Use passive defenders and allow 2 touches each."
    ]
  },
  "drill-031": {
    "setup": "Place a goalkeeper in goal and set five cones in an arc about 12 to 16 m out, at different angles. Split players into two lines with the 10 balls shared between them.",
    "steps": [
      "Each player dribbles from a cone, takes a set-up touch and shoots.",
      "Work around the arc so players shoot from central and wide angles.",
      "Shooter collects their ball and joins the next line.",
      "Rotate the goalkeeper every 3 to 4 minutes.",
      "Finish with a short competition: most goals from 5 shots wins."
    ],
    "coachingPoints": [
      "Set-up touch out of your feet, slightly to one side.",
      "Plant your standing foot beside the ball, pointing at the target.",
      "Strike with your laces and keep your head and knee over the ball.",
      "Aim for the corners, low and hard beats the goalkeeper most often.",
      "Follow in after every shot for any rebound."
    ],
    "progressions": [
      "Harder: Shoot within 2 touches of receiving a pass from the coach.",
      "Easier: Move the cones closer, to 10 m, and shoot from a still ball."
    ]
  },
  "drill-032": {
    "setup": "Mark a cone line 18 m from goal with a goalkeeper in goal. A server stands 10 m beyond the line with balls; shooters line up just inside the line with their back to goal.",
    "steps": [
      "The server passes into the shooter's feet.",
      "The shooter checks their shoulder, turns with their first touch and shoots.",
      "Shooter collects their ball and becomes the next server.",
      "Alternate turning left and right every few reps.",
      "After 8 minutes, add a passive defender behind the shooter."
    ],
    "coachingPoints": [
      "Check over your shoulder before the ball arrives.",
      "Open up on the half-turn when there is space to turn.",
      "Turning touch goes out of your feet towards goal, not sideways.",
      "Get the shot away quickly, within one or two touches of turning.",
      "Use the outside of the foot or a drag-back if the defender is tight."
    ],
    "progressions": [
      "Harder: Make the defender fully active from the start.",
      "Harder: Shooter must score within 3 seconds of receiving.",
      "Easier: Use a cone instead of a defender and let players turn freely."
    ]
  },
  "drill-033": {
    "setup": "Use one goal with a goalkeeper. Place one server on each side of the penalty area by the touchline and a central server 20 m out, with finishers in two lines on the edge of the box.",
    "steps": [
      "A wide server crosses or cuts the ball back low into the box.",
      "The finisher makes a run and shoots first time.",
      "Next rep, the central server plays a pass for a first-time shot from the edge.",
      "Rotate servers and finishers every 4 minutes.",
      "Count goals per player to add a competitive edge."
    ],
    "coachingPoints": [
      "Time your run to arrive as the ball does, not before.",
      "Side-foot for accuracy, laces for power when you have time.",
      "Keep your eyes on the ball until contact.",
      "Attack the near post or the penalty spot, not the middle of the goal.",
      "Body open to the goal before the ball reaches you."
    ],
    "progressions": [
      "Harder: Add a recovering defender who starts from behind the finisher.",
      "Harder: Serve faster and from deeper so the timing is tougher.",
      "Easier: Use rolled passes along the ground instead of crosses."
    ]
  },
  "drill-034": {
    "setup": "Place cones in a line 18 to 22 m from goal, adjusted for age. A goalkeeper is in goal and players stand in one line behind the cones, each with a ball.",
    "steps": [
      "Players take a set-up touch to the side, then strike for power.",
      "Collect your ball and rejoin the line, giving roughly 1 minute between shots.",
      "After 5 minutes, the coach rolls a pass in to strike on the move.",
      "Rotate the goalkeeper every 4 minutes.",
      "Finish with the best of 3 shots for each player."
    ],
    "coachingPoints": [
      "Approach at a slight angle and take a longer last stride.",
      "Strike through the middle of the ball with your laces, toe pointed down.",
      "Lean slightly over the ball to keep the shot down.",
      "Land on your striking foot to drive through the ball.",
      "Power comes from technique, not swinging wildly."
    ],
    "progressions": [
      "Harder: Shoot from a moving ball after a 1-2 with the coach.",
      "Easier: Move the cones in to 14 to 16 m and shoot from a still ball."
    ]
  },
  "drill-035": {
    "setup": "Use half a pitch with one goal and a goalkeeper. Mark a wide channel on each flank with cones, with wingers and balls in the channels and attackers in two lines 25 m out.",
    "steps": [
      "The attacker passes to the winger and makes a run into the box.",
      "The winger dribbles down the channel and crosses before the byline.",
      "Two attackers attack the cross: one near post, one far post.",
      "Alternate flanks each rep so both feet are used.",
      "Rotate wingers and attackers every 5 minutes."
    ],
    "coachingPoints": [
      "Attackers split runs: one near post, one far post.",
      "Hold your run, then attack the ball late and at pace.",
      "Wingers look up before crossing and pick out a runner.",
      "Finish low across the goalkeeper or back across goal.",
      "Side-foot volleys for accuracy from low crosses."
    ],
    "progressions": [
      "Harder: Add one defender in the box to make it 2 v 1.",
      "Harder: Wingers must cross first time from a pass.",
      "Easier: Use low crosses and cut-backs only."
    ]
  },
  "drill-036": {
    "setup": "Use one goal with a goalkeeper. Shooters line up 12 m from goal; a server stands to the side of the goal with balls, about 5 m from the shooter.",
    "steps": [
      "The server underarm throws a looping ball to the shooter.",
      "The shooter volleys or half-volleys at goal.",
      "Start with half-volleys, letting the ball bounce once first.",
      "Move on to full volleys from the air after 5 minutes.",
      "Rotate the server and goalkeeper every 4 minutes."
    ],
    "coachingPoints": [
      "Watch the ball all the way onto your foot.",
      "Get your knee over the ball to keep the shot down.",
      "Lock your ankle and strike with your laces.",
      "Short, controlled swing; accuracy beats power.",
      "Adjust your feet early so you are side-on or square to the ball."
    ],
    "progressions": [
      "Harder: Serve from wider angles for side volleys.",
      "Harder: Volley from a lofted pass played by foot.",
      "Easier: Start closer, at 8 m, and use half-volleys only."
    ]
  },
  "drill-037": {
    "setup": "Mark a 25 x 20 m area in front of goal with a goalkeeper. Attackers line up 25 m out; defenders line up beside the goalpost, with the coach holding balls.",
    "steps": [
      "The coach passes to the attacker.",
      "At the same moment, a defender runs out to close down.",
      "The attacker must shoot before the defender blocks or wins the ball.",
      "Play it out as 1 v 1 until a shot, goal or tackle.",
      "Swap lines after each go and rest between reps."
    ],
    "coachingPoints": [
      "Take a big first touch forward if there is space.",
      "Shoot early before the defender gets set.",
      "Use the defender as a screen to hide your shot.",
      "Stay composed: pick a corner before you strike.",
      "Shift the ball half a yard to make room to shoot."
    ],
    "progressions": [
      "Harder: Start the defender closer, so there is less time.",
      "Harder: Make it 2 v 2 with a goal from a pass or a shot.",
      "Easier: Make the defender start further away or play passive."
    ]
  },
  "drill-038": {
    "setup": "Place a goalkeeper in goal and cones 12 to 14 m out in a central position and both sides. Players form one line with a ball each.",
    "steps": [
      "Players dribble to the cone and shoot with their weaker foot only.",
      "Start with side-foot finishes for accuracy.",
      "After 5 minutes, move on to laces strikes.",
      "Then receive a pass from the coach and shoot weak foot first time.",
      "Count goals scored with the weaker foot for a short competition."
    ],
    "coachingPoints": [
      "Set your touch onto your weaker foot early.",
      "Plant the standing foot beside the ball, pointing at the target.",
      "Slow down a little to get the technique right.",
      "Lock the ankle and follow through towards the target.",
      "Praise effort and good technique, not just goals."
    ],
    "progressions": [
      "Harder: Add a passive defender forcing play onto the weaker side.",
      "Easier: Move the cones closer and remove the goalkeeper for some reps."
    ]
  },
  "drill-039": {
    "setup": "Use one goal with a goalkeeper set 6 to 8 m off the line. Attackers line up 20 m out, each with a ball.",
    "steps": [
      "The attacker dribbles towards goal.",
      "The goalkeeper comes out to close down.",
      "Around 8 to 12 m out, the attacker chips over the goalkeeper.",
      "Collect your ball and rejoin the line.",
      "Rotate the goalkeeper every 4 minutes."
    ],
    "coachingPoints": [
      "Look up early to see where the goalkeeper is.",
      "Get your toe under the ball with a short, stabbing action.",
      "Lean back slightly to lift the ball, but not too far.",
      "Short follow-through for height, not distance.",
      "Only chip when the goalkeeper is off their line."
    ],
    "progressions": [
      "Harder: Add a chasing defender so the chip must be quick.",
      "Harder: Chip from a rolling pass rather than a dribble.",
      "Easier: Start without a goalkeeper and chip over a cone or mannequin."
    ]
  },
  "drill-040": {
    "setup": "Place a goalkeeper in goal and cones 14 to 16 m out. Divide the goal into scoring zones with cones: corners worth 3, central areas worth 1. Split players into two teams.",
    "steps": [
      "Teams take turns to shoot from the cones.",
      "Goals in the corner zones score 3 points, central goals score 1.",
      "Rotate shooting angles every round.",
      "Play 3 rounds, with each player taking one shot per round.",
      "The team with the most points wins."
    ],
    "coachingPoints": [
      "Pick your target zone before you strike.",
      "Accuracy beats power when the corners are worth more.",
      "Stay calm under pressure from the scoreboard.",
      "Encourage teammates after misses.",
      "Follow in for rebounds."
    ],
    "progressions": [
      "Harder: Add a defender who closes down from the side.",
      "Easier: Make all goals worth 1 point and move closer."
    ]
  },
  "drill-041": {
    "setup": "Use one goal with a goalkeeper. Place cones just outside the penalty area, 18 to 22 m out, and line up players with balls behind.",
    "steps": [
      "The coach plays a pass into the shooter.",
      "The shooter takes one touch out of feet and shoots.",
      "Shooter collects their ball and returns to the line.",
      "Alternate between central and slightly wide positions.",
      "Rotate the goalkeeper every 4 minutes."
    ],
    "coachingPoints": [
      "Take your touch out of your feet to set up the shot.",
      "Keep your head and knee over the ball to keep it low.",
      "Aim inside the posts; make the goalkeeper work.",
      "Follow through towards the target.",
      "Shoot when you see the goalkeeper off their line."
    ],
    "progressions": [
      "Harder: Add a defender to close you down from the side.",
      "Easier: Start from the edge of the area at 16 m."
    ]
  },
  "drill-042": {
    "setup": "Use the penalty area with a goalkeeper in goal. Coaches serve from different areas; attackers and defenders line up 20 m out in lines.",
    "steps": [
      "Scenario one: coach passes for a first-time finish from the penalty spot.",
      "Scenario two: cut-back from the byline for a far-post finish.",
      "Scenario three: 2 v 1 inside the box, attackers finish quickly.",
      "Rotate attackers, defenders and goalkeeper every 5 minutes.",
      "Finish with a 3 v 2 game inside the box."
    ],
    "coachingPoints": [
      "Be on your toes, ready for loose balls.",
      "Find a pocket of space between defenders.",
      "Finish quickly; you have less time inside the box.",
      "Side-foot for accuracy in close.",
      "Follow up every shot for rebounds."
    ],
    "progressions": [
      "Harder: Add defenders and limit time to 6 seconds per attack.",
      "Easier: Remove defenders and focus on finishing technique."
    ]
  },
  "drill-043": {
    "setup": "Use one goal with a goalkeeper. Servers stand on each side of the goal about 8 m out; players form a line 10 to 12 m out. Use soft balls for heading and limit headers per player.",
    "steps": [
      "The server underarm throws a ball for the player to head towards goal.",
      "Next rep, the server throws for a volley.",
      "Alternate between headers and volleys.",
      "Rotate servers and goalkeeper every 4 minutes.",
      "Keep heading reps low, around 5 per player per session."
    ],
    "coachingPoints": [
      "Head with your forehead, eyes open, mouth closed.",
      "Head the ball down towards the goal line.",
      "Volley with your laces and knee over the ball.",
      "Adjust your feet early to get into position.",
      "Watch the ball all the way."
    ],
    "progressions": [
      "Harder: Serve from wider angles for diving headers or side volleys.",
      "Easier: Use soft throws and replace headers with volleys for younger players."
    ]
  },
  "drill-044": {
    "setup": "Use half a pitch with a goal and goalkeeper. Place cones on the halfway line for attackers and on the edge of the area for defenders.",
    "steps": [
      "The coach plays a ball to two attackers on the halfway line.",
      "One defender starts from the edge of the area.",
      "The attackers break quickly and try to score within 8 seconds.",
      "Rotate roles after each attack.",
      "Rest for 30 seconds between reps."
    ],
    "coachingPoints": [
      "Run forward with your first touch.",
      "Spread wide to stretch the defender.",
      "Pass at the right moment to commit the defender.",
      "Finish early; do not wait for the defence to recover.",
      "Composure in front of goal."
    ],
    "progressions": [
      "Harder: Make it 3 v 2 with a recovering defender.",
      "Easier: Make it 2 v 0 and add the defender later."
    ]
  },
  "drill-045": {
    "setup": "Set up 4 stations across two goals: one-touch finishing, volleys, turning shots and long-range. Each station has cones and balls, with 4 or more players per station.",
    "steps": [
      "Spread players equally across the 4 stations.",
      "Each group spends 5 minutes at a station.",
      "On the whistle, groups rotate clockwise.",
      "Coaches or helpers serve at each station.",
      "Finish with a short 1-minute recovery between rotations."
    ],
    "coachingPoints": [
      "Focus on technique at every station.",
      "Quality over quantity.",
      "Adapt your strike to the situation.",
      "Encourage teammates.",
      "Keep moving between shots."
    ],
    "progressions": [
      "Harder: Add a defender to each station.",
      "Easier: Reduce distances and allow more touches."
    ]
  },
  "drill-046": {
    "setup": "Mark a 15 x 10 m channel with a 2 m cone gate at each end. Attackers line up at one end with balls, defenders at the other.",
    "steps": [
      "The defender passes to the attacker and closes down.",
      "The attacker tries to dribble through the gate behind the defender.",
      "If the defender wins the ball, they try to dribble through the opposite gate.",
      "Swap roles after each go.",
      "Rest for about 30 seconds between reps."
    ],
    "coachingPoints": [
      "Attack the defender at speed.",
      "Use a feint or body swerve to unbalance them.",
      "Change of pace after the move.",
      "Keep the ball close when the defender is near.",
      "Be brave and try things."
    ],
    "progressions": [
      "Harder: Narrow the channel to 8 m.",
      "Easier: Widen the channel and make the defender passive."
    ]
  },
  "drill-047": {
    "setup": "Set out a 20 m course: a slalom of 6 cones 1.5 m apart, then a square of 4 cones. Players start in lines of 3 to 4, each with a ball.",
    "steps": [
      "Weave through the slalom using both feet.",
      "Dribble around the square of cones.",
      "Sprint with the ball back to the start.",
      "Next player goes when the first finishes the slalom.",
      "Run as a relay race for the last 5 minutes."
    ],
    "coachingPoints": [
      "Keep the ball close with small touches.",
      "Use both feet and different surfaces.",
      "Head up between touches.",
      "Speed up once you are through the cones.",
      "Stay low and balanced."
    ],
    "progressions": [
      "Harder: Use only the weaker foot.",
      "Easier: Space cones further apart."
    ]
  },
  "drill-048": {
    "setup": "Mark a 20 x 20 m square with players spread out, each with a ball.",
    "steps": [
      "Players dribble freely around the square.",
      "On the coach's call, perform a turn: drag-back, inside hook or Cruyff turn.",
      "Accelerate away for 3 to 4 m after each turn.",
      "Add a new turn every few minutes.",
      "Finish with a game of tag with the ball."
    ],
    "coachingPoints": [
      "Lower your centre of gravity.",
      "Use small touches before the turn.",
      "Explode away after changing direction.",
      "Head up to find space.",
      "Use both feet."
    ],
    "progressions": [
      "Harder: Add defenders who try to win the ball.",
      "Easier: Reduce the number of turns and slow the pace."
    ]
  },
  "drill-049": {
    "setup": "Mark three 25 m lanes with cones. Players start in lines of 3 to 4 at one end, each with a ball.",
    "steps": [
      "Dribble at full speed to the end cone.",
      "Turn and jog back with the ball.",
      "Rest for 30 to 45 seconds between runs.",
      "Next run: dribble with the weaker foot.",
      "Finish with races between lanes."
    ],
    "coachingPoints": [
      "Push the ball ahead with your laces.",
      "Fewer touches at top speed.",
      "Head up between touches.",
      "Keep control when slowing down.",
      "Arms help drive your running."
    ],
    "progressions": [
      "Harder: Add a chasing defender.",
      "Easier: Shorten the lanes to 15 m."
    ]
  },
  "drill-050": {
    "setup": "Mark a 20 x 20 m area with players spread out, each with a ball and a cone as a pretend defender.",
    "steps": [
      "The coach demonstrates a move: step-over, scissors or Maradona turn.",
      "Players practise the move slowly on their cone.",
      "Speed up once they are confident.",
      "Introduce a new move every 5 minutes.",
      "Finish with a 1 v 1 to test the moves."
    ],
    "coachingPoints": [
      "Sell the fake with your body and shoulders.",
      "Accelerate away after the move.",
      "Practise on both sides.",
      "Keep the ball close.",
      "Be creative and try new moves."
    ],
    "progressions": [
      "Harder: Use moves against a live defender.",
      "Easier: Practise moves without a ball first."
    ]
  },
  "drill-051": {
    "setup": "Set out 4 lanes of 5 cones, 2 m apart, with a start cone 3 m before each lane. Split players into 4 teams of 3 to 5, one ball per team.",
    "steps": [
      "First player in each team dribbles in and out of the cones to the end.",
      "Go round the last cone and dribble straight back to the start.",
      "Stop the ball dead at the next teammate's feet to hand over.",
      "Keep going until every player has had a turn, then sit down.",
      "First team sitting down wins the race; play 4 to 5 races with rests."
    ],
    "coachingPoints": [
      "Small touches through the cones, keep the ball close.",
      "Use both feet and the inside and outside of the foot.",
      "Head up between cones to see the next gap.",
      "Speed up with bigger touches on the straight run back."
    ],
    "progressions": [
      "Harder: weaker foot only through the cones.",
      "Harder: add a turn at the halfway cone, such as a drag-back.",
      "Easier: widen the cones to 3 m apart and walk the first race."
    ]
  },
  "drill-052": {
    "setup": "Mark a 10 x 10 m area per pair using existing pitch markings. Players work in pairs with one ball between two.",
    "steps": [
      "Attacker stands on the ball with the defender behind them.",
      "On the coach's call, the defender tries to touch the ball with their foot.",
      "Attacker keeps the ball by shielding for 20 seconds.",
      "Swap roles after each round and rest for 30 seconds.",
      "Progress to the attacker dribbling while shielding, scoring a point for every 10 seconds kept."
    ],
    "coachingPoints": [
      "Get side-on, body between the defender and the ball.",
      "Low centre of gravity, knees bent, arms out wide for balance.",
      "Keep the ball on the foot furthest from the defender.",
      "Feel where the defender is and roll the ball away from them.",
      "No pushing or holding with hands, use body position."
    ],
    "progressions": [
      "Harder: attacker must shield then turn to dribble over an end line.",
      "Harder: increase rounds to 30 seconds with full pressure.",
      "Easier: defender plays at half pressure, passive only."
    ]
  },
  "drill-053": {
    "setup": "Mark a 30 x 25 m area with a goal at one end and a goalkeeper. Split players into attackers and defenders in two lines at halfway, balls with the attackers.",
    "steps": [
      "Coach passes to the first attacker, who dribbles at the goal.",
      "A defender starts 5 m behind and to the side, chasing to recover.",
      "Attacker beats the defender with a move and finishes on goal.",
      "Progress to 2 v 1 then 2 v 2 with defenders starting from the end line.",
      "If the defender wins the ball, they dribble out over halfway to score.",
      "Rotate roles so everyone attacks and defends."
    ],
    "coachingPoints": [
      "Drive at the defender quickly to make them back off.",
      "Commit the defender, then change direction or speed past them.",
      "Take the first chance to shoot, don't over-dribble.",
      "Shift the ball out of your feet to open a shooting angle.",
      "Look up before shooting and aim low across the goalkeeper."
    ],
    "progressions": [
      "Harder: defenders start closer, giving less time to attack.",
      "Harder: 5-second limit to get a shot away.",
      "Easier: defender starts further back, or uses passive pressure."
    ]
  },
  "drill-054": {
    "setup": "Mark a 20 x 20 m area. Every player has a ball and their own space, spread out facing the coach.",
    "steps": [
      "Coach demonstrates each move, then players copy for 45 seconds.",
      "Work through toe taps, sole rolls, inside-outside touches and drag-backs.",
      "Add pull-backs, step-overs and Cruyff turns as players improve.",
      "Rest for 20 seconds between each move.",
      "Finish with a 1-minute challenge counting touches in time."
    ],
    "coachingPoints": [
      "Stay on your toes, light and bouncy.",
      "Small, soft touches using all parts of both feet.",
      "Keep the ball within a step of your body.",
      "Try to look up while the ball moves.",
      "Go slowly first, then speed up when it feels easy."
    ],
    "progressions": [
      "Harder: put two moves together, such as sole roll into drag-back.",
      "Harder: do the moves while dribbling around the area.",
      "Easier: use one foot only and go at walking pace."
    ]
  },
  "drill-055": {
    "setup": "Mark a 20 x 20 m area with cones. Every player has a ball and starts dribbling inside the area.",
    "steps": [
      "Players dribble freely without touching anyone else or their ball.",
      "On the coach's shout, change direction, stop or speed up.",
      "Coach shrinks the area with cones every 2 minutes to add traffic.",
      "Coach holds up fingers; players call out the number to prove they're looking up.",
      "Rest 30 seconds between rounds of 2 minutes."
    ],
    "coachingPoints": [
      "Head up, scan for space before every few touches.",
      "Keep the ball close so you can change direction quickly.",
      "Move into gaps, not towards other players.",
      "Use the outside of the foot to swerve away from traffic."
    ],
    "progressions": [
      "Harder: shrink the area to 12 x 12 m.",
      "Harder: add 2 defenders without balls trying to win a ball.",
      "Easier: start in a bigger 25 x 25 m area."
    ]
  },
  "drill-056": {
    "setup": "Mark a 20 x 20 m area. Place a cone gate as a pretend defender in the middle of each of several lanes, with one ball per player.",
    "steps": [
      "Coach demonstrates one feint, such as a body swerve or step-over.",
      "Players dribble towards the cone at half pace.",
      "Perform the feint 1 m before the cone and accelerate away.",
      "Practise each feint for 3 to 4 minutes, both sides.",
      "Finish with a live 1 v 1 where the defender must be beaten with a feint."
    ],
    "coachingPoints": [
      "Sell the fake: drop your shoulder and shift your weight.",
      "Do the move about one big step from the defender.",
      "Explode away after the feint, change of speed wins.",
      "Practise on both sides so you are hard to read."
    ],
    "progressions": [
      "Harder: replace the cone with a passive defender, then an active one.",
      "Harder: combine two feints, such as step-over into scissors.",
      "Easier: walk through the move without a ball first."
    ]
  },
  "drill-057": {
    "setup": "Mark a 10 x 10 m area with cones. Up to 12 players inside, each with a ball.",
    "steps": [
      "Players dribble inside the small area without leaving it.",
      "Avoid contact with other players and balls.",
      "On the coach's call, perform a set turn or stop.",
      "Every 90 seconds, shrink the area by moving cones inwards.",
      "Rest 30 seconds between rounds."
    ],
    "coachingPoints": [
      "Touch the ball every step, tiny touches only.",
      "Use the sole to stop and roll the ball away from danger.",
      "Body low and balanced, ready to change direction.",
      "Scan constantly; space in tight areas opens and closes fast."
    ],
    "progressions": [
      "Harder: shrink to an 8 x 8 m area.",
      "Harder: 2 players without balls try to knock balls out.",
      "Easier: half the group dribbles while the other half rests."
    ]
  },
  "drill-058": {
    "setup": "Mark a 25 x 25 m area with 6 numbered cones scattered inside. Split players into pairs or threes, one ball each.",
    "steps": [
      "Coach calls a sequence of numbers, such as 3, 1, 5.",
      "Players dribble round each called cone in order.",
      "Return to the middle and stop the ball with the sole.",
      "First player back in the middle with the right sequence wins a point.",
      "Make sequences longer as players get the idea."
    ],
    "coachingPoints": [
      "Look up and find your next cone before you reach the current one.",
      "Keep the ball close when going round a cone.",
      "Use bigger touches in open space to go faster.",
      "Watch out for other players heading to the same cone."
    ],
    "progressions": [
      "Harder: call sums, such as 2 plus 3, so players work out the cone.",
      "Harder: weaker foot only.",
      "Easier: call one or two numbers at a time."
    ]
  },
  "drill-059": {
    "setup": "Mark a 20 x 20 m area with two lines of cones 10 m apart. Players pair up opposite each other with one ball each.",
    "steps": [
      "Coach demonstrates one turn: inside hook, outside hook, drag-back or Cruyff.",
      "Players dribble towards the opposite line.",
      "At the cone, perform the turn and dribble back.",
      "Practise each turn for 3 minutes using both feet.",
      "Finish with a passive defender following to give a reason to turn."
    ],
    "coachingPoints": [
      "Slow down into the turn, speed up out of it.",
      "Drop the shoulder and get your body over the ball.",
      "Take the ball away in a new direction with one sharp touch.",
      "Check over your shoulder before you turn."
    ],
    "progressions": [
      "Harder: coach shouts which turn to use at the last moment.",
      "Harder: add an active defender following from behind.",
      "Easier: practise turns at walking pace with no cones."
    ]
  },
  "drill-060": {
    "setup": "Mark a 20 x 20 m area with cones. Every player has a ball; the coach names 2 taggers.",
    "steps": [
      "All players dribble around the area keeping control of their ball.",
      "Taggers dribble too and try to tag players with a hand.",
      "A tagged player swaps roles and becomes a tagger.",
      "If a ball leaves the area, that player becomes a tagger.",
      "Play rounds of 2 minutes with a 30-second rest."
    ],
    "coachingPoints": [
      "Head up to see where the taggers are.",
      "Keep the ball close so you can dodge quickly.",
      "Change speed and direction to escape.",
      "Use the space; don't get trapped in a corner."
    ],
    "progressions": [
      "Harder: add a third tagger or shrink the area.",
      "Harder: tagged players must perform 10 toe taps before rejoining.",
      "Easier: taggers play without a ball and walk only."
    ]
  },
  "drill-061": {
    "setup": "Mark several 10 x 15 m channels with a 2 m cone gate at each end. Players pair up, attacker with the ball at one end and defender at the other.",
    "steps": [
      "Defender passes to the attacker to start.",
      "Defender closes down quickly, then slows to get set.",
      "Attacker tries to dribble through the defender's gate.",
      "Defender wins by stopping the ball or forcing it out.",
      "Play 4 to 5 attempts each, then swap roles."
    ],
    "coachingPoints": [
      "Close down fast while the ball travels, slow down as it arrives.",
      "Side-on stance, low and on your toes.",
      "Show the attacker one way, ideally towards the sideline.",
      "Stay arm's length away and be patient.",
      "Only tackle when the attacker takes a heavy touch."
    ],
    "progressions": [
      "Harder: widen the channel so the defender has more space to cover.",
      "Harder: attacker can score through either of two end gates.",
      "Easier: attacker must stay at walking pace for the first rep."
    ]
  },
  "drill-062": {
    "setup": "Mark 5 m wide channels, 15 m long, with cones. Players work in pairs with one ball, attacker at one end and defender facing them.",
    "steps": [
      "Attacker dribbles slowly towards the defender.",
      "Defender backs off, side-on, keeping arm's length away.",
      "Defender aims to slow the attacker and keep them in the channel.",
      "Attacker can't beat them yet; they move side to side at half pace.",
      "Swap roles after 3 runs, then build up to live 1 v 1."
    ],
    "coachingPoints": [
      "Side-on body shape, one foot in front of the other.",
      "Knees bent, weight on the balls of your feet.",
      "Small shuffling steps, don't cross your feet.",
      "Watch the ball, not the attacker's tricks.",
      "Show them one way, usually away from goal."
    ],
    "progressions": [
      "Harder: attacker goes at full speed and can try to beat the defender.",
      "Harder: make the channel wider at 8 m.",
      "Easier: attacker walks without a ball so defender learns footwork."
    ]
  },
  "drill-063": {
    "setup": "Mark 10 x 10 m grids, one per pair, with one ball between two. Use a dry, soft area of grass.",
    "steps": [
      "Coach demonstrates the block tackle with a still ball.",
      "Partners both place the inside of the foot against the ball at walking pace.",
      "Progress to the attacker dribbling slowly while the defender times the tackle.",
      "Finish with live 1 v 1 in the grid for 45 seconds.",
      "Swap roles and rest between rounds."
    ],
    "coachingPoints": [
      "Tackle with the inside of the foot, ankle locked firm.",
      "Get your weight forward and body over the ball.",
      "Plant your standing foot close to the ball.",
      "Tackle when the ball is away from the attacker's feet.",
      "Always aim for the ball, never the player."
    ],
    "progressions": [
      "Harder: tackle then dribble out of the grid to score.",
      "Harder: attacker plays at full pace.",
      "Easier: practise only with the still ball, no live play."
    ]
  },
  "drill-064": {
    "setup": "Mark a 40 x 30 m area with 3 small cone goals on the halfway line. Set up 4 defenders against 4 attackers plus a coach feeding balls.",
    "steps": [
      "Coach walks the defenders through shape with the ball in different positions.",
      "Defenders shuffle across as the coach moves the ball side to side.",
      "Play 4 v 4 live; attackers score by dribbling through the cone goals.",
      "Coach freezes play to correct positions when needed.",
      "If defenders win the ball, they pass to the coach for a point."
    ],
    "coachingPoints": [
      "Nearest player presses the ball, others cover behind.",
      "Stay goal-side: between your opponent and your goal.",
      "Keep 10 to 15 m between defenders to stay compact.",
      "Shift across as a group when the ball moves.",
      "See both the ball and your player at the same time."
    ],
    "progressions": [
      "Harder: play 4 v 5 with an extra attacker.",
      "Harder: attackers have a 3-touch limit to speed play up.",
      "Easier: attackers walk with the ball in hands for the first round."
    ]
  },
  "drill-065": {
    "setup": "Mark a 40 x 30 m area split into thirds. Play 6 pressing players against 6 players plus 2 floaters.",
    "steps": [
      "Possession team tries to make 8 passes for a point.",
      "Pressing team works as a group to win the ball back.",
      "Pressing team scores by winning the ball and dribbling over an end line.",
      "Coach sets a trigger to press, such as a back pass or bad touch.",
      "Play 3-minute rounds with 90 seconds of rest, then swap teams."
    ],
    "coachingPoints": [
      "First presser curves the run to block one passing option.",
      "Teammates move up together, no gaps between lines.",
      "Press on the trigger, not one at a time.",
      "Squeeze the ball to one side and lock it there.",
      "If the press is beaten, drop back together quickly."
    ],
    "progressions": [
      "Harder: possession team plays with 2 extra floaters.",
      "Harder: pressing team must win the ball inside 8 seconds.",
      "Easier: reduce the area to 30 x 25 m."
    ]
  },
  "drill-066": {
    "setup": "Mark a 30 x 20 m area with a cone gate at each end. Attackers start on halfway with balls; defenders start 3 m in front, facing the wrong way.",
    "steps": [
      "Attacker dribbles past the defender, who has their back turned.",
      "On the coach's call, the defender turns and sprints to recover.",
      "Defender aims to get goal-side and stop the attacker scoring through the gate.",
      "Play 4 runs each, with a 45-second walk back as rest.",
      "Swap roles so everyone recovers."
    ],
    "coachingPoints": [
      "Turn and sprint towards your own goal, not at the ball.",
      "Get back on the inside line, goal-side of the attacker.",
      "Once level, slow down and get side-on to defend.",
      "Don't dive in from behind; time the tackle."
    ],
    "progressions": [
      "Harder: defender starts 5 m behind the attacker.",
      "Harder: add a second attacker for a 2 v 1 recovery.",
      "Easier: defender starts side-on and level with the attacker."
    ]
  },
  "drill-067": {
    "setup": "For U12 and above only, following FA heading guidance. Work in groups of 3 in a 15 x 10 m area with a size 4 or light ball.",
    "steps": [
      "Server underarm throws the ball gently to the header.",
      "Header heads the ball high and wide back over the server.",
      "Do no more than 5 headers each, then rotate roles.",
      "Progress to a short run-in to meet the ball.",
      "Keep total headers per player low across the session."
    ],
    "coachingPoints": [
      "Eyes open, mouth closed.",
      "Head the ball with your forehead, not the top of the head.",
      "Attack the ball, don't wait for it to hit you.",
      "Aim high, far and wide to clear danger.",
      "Use your arms for balance, not to push."
    ],
    "progressions": [
      "Harder: server lobs from 8 m away with a gentle throw.",
      "Harder: add a passive attacker challenging for position.",
      "Easier: practise with a soft or light ball from 2 m away."
    ]
  },
  "drill-068": {
    "setup": "Mark a 40 x 30 m area with a cone goal at each end. Play 6 v 6 with bibs, each defender given a specific opponent.",
    "steps": [
      "Each defender is paired with one opponent to mark.",
      "Attackers make runs to lose their marker and receive passes.",
      "Defenders track their runner all game.",
      "Play 4-minute games with 90 seconds of rest, then swap roles.",
      "Coach calls 'switch' and players change their marker."
    ],
    "coachingPoints": [
      "Stay goal-side and ball-side of your player.",
      "Keep both the ball and your player in sight.",
      "Close enough to tackle, far enough not to be beaten.",
      "Run with your runner; don't ball-watch.",
      "Communicate when passing a runner on."
    ],
    "progressions": [
      "Harder: give the attackers 2 floaters to overload.",
      "Harder: attackers score only from a run beyond the defender.",
      "Easier: play 4 v 4 in a smaller area."
    ]
  },
  "drill-069": {
    "setup": "Set up a goal with a goalkeeper. Shooters line up 18 m out with balls; defenders start 6 m in front of them.",
    "steps": [
      "Coach demonstrates the blocking body shape without a ball.",
      "Shooter takes a low shot at half power; defender steps across to block.",
      "Progress to the defender closing down from the goal line as the ball is played.",
      "Shooter shoots at normal power once the defender is confident.",
      "Rotate shooters, blockers and goalkeeper every 4 shots."
    ],
    "coachingPoints": [
      "Close the shooter down quickly, then set yourself.",
      "Stay on your feet and make yourself big.",
      "Arms behind your back to avoid handball.",
      "Turn your body slightly side-on, never your face.",
      "Block the near post side; let the goalkeeper cover the rest."
    ],
    "progressions": [
      "Harder: shooter can take one touch to change the angle.",
      "Harder: two shooters so the defender must react.",
      "Easier: use a soft ball and roll shots along the ground."
    ]
  },
  "drill-070": {
    "setup": "Use a goal with a goalkeeper and the penalty area. Place 2 wide crossers by the touchlines, 3 defenders and 2 attackers in the box.",
    "steps": [
      "Wide player dribbles to the byline and crosses.",
      "Defenders hold a line and track the attackers' runs.",
      "Defenders aim to clear the ball out of the box.",
      "Goalkeeper shouts 'keeper' to claim crosses they can reach.",
      "Alternate crosses from left and right; rotate roles every 6 crosses."
    ],
    "coachingPoints": [
      "Body open to see both the ball and the attacker.",
      "Stay goal-side and get to the front post first.",
      "Clear high, wide and long; don't play across your own box.",
      "Listen for the goalkeeper's call and get out of the way.",
      "After clearing, step out together to push the line up."
    ],
    "progressions": [
      "Harder: add a third attacker to make it 3 v 3.",
      "Harder: crossers can cut back to the edge of the box.",
      "Easier: crosses thrown in by hand at a steady height."
    ]
  },
  "drill-071": {
    "setup": "Only on soft, dry grass in moulded boots, never on artificial pitches or hard ground. Mark a 15 x 10 m area with a still ball on a cone.",
    "steps": [
      "Coach demonstrates the slide tackle on a still ball.",
      "Players walk in and practise the slide on the still ball.",
      "Progress to a ball rolled slowly by a partner.",
      "Keep to 6 to 8 slides each, with rest in between.",
      "No live slide tackles against opponents in this session."
    ],
    "coachingPoints": [
      "Only slide when you can't stay on your feet to defend.",
      "Slide on the side of your leg, not your knees.",
      "Hit the ball with the leading foot, studs never showing.",
      "Get up quickly after the tackle.",
      "Timing: go for the ball when it's away from the player."
    ],
    "progressions": [
      "Harder: partner dribbles slowly and the tackler slides from the side.",
      "Harder: block the ball and recover to feet in one movement.",
      "Easier: practise the body shape on grass without a ball."
    ]
  },
  "drill-072": {
    "setup": "Mark a 30 x 25 m area with cones. Play 4 defenders against 4 attackers, with the coach feeding balls.",
    "steps": [
      "Before starting, agree key calls: 'press', 'step', 'drop' and 'man on'.",
      "Play 4 v 4 with attackers trying to dribble over the end line.",
      "Defenders must talk to organise, every action needs a call.",
      "Coach freezes play if a defender goes silent.",
      "Play 3-minute rounds, rotate roles and rest."
    ],
    "coachingPoints": [
      "Short, loud, clear calls, use names.",
      "Nearest defender calls 'press', others say 'cover'.",
      "Tell teammates what to do, not what went wrong.",
      "Goalkeeper or last defender organises the line.",
      "Praise good calls to build a talking team."
    ],
    "progressions": [
      "Harder: no talking allowed for the attackers, only defenders.",
      "Harder: add an extra attacker for 4 v 5.",
      "Easier: coach freezes play and asks players for the right call."
    ]
  },
  "drill-073": {
    "setup": "Mark a 40 x 30 m pitch with a goal at each end. Play 6 v 6 plus goalkeepers.",
    "steps": [
      "Play a normal game with both teams attacking.",
      "When a team loses the ball, they must stop the counter-attack.",
      "Coach adds a second ball to the losing team's half to create sudden transitions.",
      "Team gets a bonus point for winning the ball back within 6 seconds.",
      "Play 4-minute games with 90 seconds of rest."
    ],
    "coachingPoints": [
      "React instantly when the ball is lost, no stopping.",
      "Nearest player delays the ball; others sprint back goal-side.",
      "Get compact behind the ball before you press.",
      "Stop the forward pass first, then win the ball.",
      "Communicate who is pressing and who is covering."
    ],
    "progressions": [
      "Harder: losing team has a player removed for 5 seconds after losing the ball.",
      "Harder: goals from counter-attacks count double.",
      "Easier: play 5 v 5 on a smaller pitch."
    ]
  },
  "drill-074": {
    "setup": "Mark a 40 x 30 m area divided into 4 vertical zones with cones. Play 4 defenders in zones against 5 attackers, with 2 cone goals on the end line.",
    "steps": [
      "Each defender starts in their own zone.",
      "Coach moves the ball; defenders shift across while staying linked.",
      "Play live; attackers try to score through a cone goal.",
      "Defenders pass on runners when they leave their zone.",
      "Play 3-minute rounds, rest 90 seconds, then rotate."
    ],
    "coachingPoints": [
      "Defend space first, then the player in your space.",
      "Move across together as the ball moves.",
      "Keep the distances between defenders the same.",
      "Shout 'yours' when passing a runner on to a teammate.",
      "Stay compact; don't get pulled out of shape."
    ],
    "progressions": [
      "Harder: play 4 v 6 with an extra attacker.",
      "Harder: attackers play 2-touch to move the ball quickly.",
      "Easier: coach walks the ball around first so defenders learn the shifts."
    ]
  },
  "drill-075": {
    "setup": "Mark a 30 x 30 m area with cones. Play 6 v 6 plus 2 floaters.",
    "steps": [
      "Teams play keep-ball; 6 passes in a row scores a point.",
      "When a team loses the ball, they press immediately.",
      "Team scores a bonus point for winning the ball back inside 5 seconds.",
      "If they fail, they drop off and get compact.",
      "Play 3-minute rounds with 90 seconds of rest."
    ],
    "coachingPoints": [
      "Lose it, win it: press straight away.",
      "Nearest 2 or 3 players swarm the ball.",
      "Cut off the easy passing options around the ball.",
      "Stay close together so pressure is quick.",
      "If you can't win it in 5 seconds, drop and reset."
    ],
    "progressions": [
      "Harder: reduce the regain window to 4 seconds.",
      "Harder: possession team gets an extra floater.",
      "Easier: play in a smaller 20 x 20 m area so pressing is shorter."
    ]
  },
  "drill-076": {
    "setup": "Mark a 12 x 12 m grid with cones. Four attackers stand one on each side, two defenders in bibs start in the middle with a supply of balls nearby.",
    "steps": [
      "Attackers pass around the square, staying on their lines at first.",
      "Two defenders work together to win the ball or force it out.",
      "Count passes; ten in a row scores a point for the attackers.",
      "When a defender wins it, the attacker who lost it swaps in.",
      "Play 90-second rounds with a short rest, then rotate defenders."
    ],
    "coachingPoints": [
      "Open your body so you can see both options before the ball arrives.",
      "Move to make an angle; never hide behind a defender.",
      "Pass into the safe foot, away from the nearest defender.",
      "Defenders: one presses, one covers and blocks the split pass."
    ],
    "progressions": [
      "Harder: two-touch maximum, or shrink the grid to 10 x 10 m.",
      "Harder: a pass that splits both defenders counts as two.",
      "Easier: play 5 v 2 or allow unlimited touches."
    ]
  },
  "drill-077": {
    "setup": "Mark a 30 x 25 m area with cones. Two teams of five in different bibs, spare balls around the edge for quick restarts.",
    "steps": [
      "Coach plays a ball into one team to start.",
      "The team in possession tries to keep the ball from the other team.",
      "Eight consecutive passes scores one point.",
      "If the ball goes out, the coach plays a new ball to the other team.",
      "Play 4 x 4-minute games with a 1-minute drink break."
    ],
    "coachingPoints": [
      "Get wide and long when your team has the ball to make the pitch big.",
      "Check your shoulder before receiving so you know where the pressure is.",
      "Play forward when it is on, back or sideways when it is not.",
      "Lose the ball, react straight away and press as a group."
    ],
    "progressions": [
      "Harder: three-touch maximum, or reduce the area to 25 x 20 m.",
      "Harder: points only count after a pass to an end-line target player.",
      "Easier: add a neutral player who always plays for the team in possession."
    ]
  },
  "drill-078": {
    "setup": "Use half a pitch split into three zones with cones: defensive, middle and attacking. Full-size goal with a goalkeeper at one end, two small goals or a cone gate on the halfway line.",
    "steps": [
      "Goalkeeper starts every attack with the ball in the defensive zone.",
      "Defenders and a holding midfielder play out against two or three pressing attackers.",
      "Team scores by dribbling or passing through a halfway gate.",
      "If the pressing team wins the ball, they attack the big goal.",
      "Reset with the goalkeeper after each attack; rotate the pressers every 5 minutes."
    ],
    "coachingPoints": [
      "Centre-backs split wide to give the goalkeeper two angles.",
      "Full-backs push high and wide to stretch the press.",
      "Midfielder shows on a half-turn to receive and face forward.",
      "If it is not on, recycle back through the goalkeeper and switch.",
      "Pass with pace into the front foot to beat the press."
    ],
    "progressions": [
      "Harder: add a fourth presser or a 6-second limit in the defensive zone.",
      "Harder: ball must pass through the middle zone before scoring.",
      "Easier: pressers can only enter the defensive zone after the first pass."
    ]
  },
  "drill-079": {
    "setup": "Use the final third of a pitch, about 35 x 40 m, with one goal and goalkeeper. Six attackers against four defenders, balls with the coach on the halfway line.",
    "steps": [
      "Coach plays a ball into a midfielder at the top of the area.",
      "Attackers combine to create a shooting chance within 30 seconds.",
      "Defenders try to win the ball and clear it past the halfway cones.",
      "Each attack ends with a shot, a clearance or the time running out.",
      "Rotate attackers and defenders every 6 minutes."
    ],
    "coachingPoints": [
      "Look for one-twos, overlaps and third-man runs to unlock defenders.",
      "Attack the space between centre-back and full-back.",
      "Get bodies in the box: near post, far post and penalty spot.",
      "Shoot early when you see the goal; hit the target first."
    ],
    "progressions": [
      "Harder: reduce the time limit to 20 seconds or add a fifth defender.",
      "Harder: goals from a cross or cut-back count double.",
      "Easier: play 6 v 3 to give attackers more time on the ball."
    ]
  },
  "drill-080": {
    "setup": "Use half a pitch with a back four and a midfield four in bibs. Six attackers start on the halfway line, coach in the centre circle with the balls.",
    "steps": [
      "Defending eight set up in two banks of four, about 10 m apart.",
      "Coach plays a ball to the attackers, who try to score through end gates or a target zone.",
      "Defenders shift as one unit towards the ball.",
      "When defenders win the ball, they score by passing into the coach.",
      "Play 3-minute rounds, then reset and discuss shape."
    ],
    "coachingPoints": [
      "Slide across together; keep the gaps between players small.",
      "Nearest player presses, the next one covers behind.",
      "Keep 10 to 15 m between your two lines so no one plays through.",
      "Step up together when the ball goes backwards.",
      "Talk all the time: names, 'press', 'drop', 'hold'."
    ],
    "progressions": [
      "Harder: add a seventh attacker to overload the defence.",
      "Harder: attackers get a bonus point for a switch of play.",
      "Easier: walk through the shape first with the coach moving the ball by hand."
    ]
  },
  "drill-081": {
    "setup": "Mark a 50 x 35 m pitch with a goal at each end. Two teams of seven to nine, a defending team camped deep and an attacking team pressing high.",
    "steps": [
      "Team A attacks Team B's goal with numbers forward.",
      "When Team B wins the ball, they break fast to score at the other end.",
      "A goal on the counter within 10 seconds of winning the ball counts double.",
      "After each attack, restart with the coach's ball to Team A.",
      "Swap roles every 5 minutes."
    ],
    "coachingPoints": [
      "First look forward the moment you win the ball.",
      "Runners sprint wide and long to stretch the defence.",
      "Carry the ball at speed into space, then release at the right moment.",
      "Few touches, quick passes; finish before the defence recovers.",
      "Losing team: delay the attacker and recover goal-side."
    ],
    "progressions": [
      "Harder: counter-attack must score within 8 seconds.",
      "Harder: give the attacking team an extra recovering defender.",
      "Easier: start the counter as a 3 v 2 from the halfway line."
    ]
  },
  "drill-082": {
    "setup": "Use a full pitch or three-quarter pitch with two goals and goalkeepers. Two teams of seven to nine, wide channels marked with cones 8 m in from each touchline.",
    "steps": [
      "Play a normal match with the wide channels marked.",
      "Only one attacker per team may stand in each wide channel.",
      "A goal scored after the ball enters a wide channel counts double.",
      "Coach freezes play to check team shape when needed.",
      "Play 2 x 8-minute halves with a 2-minute break."
    ],
    "coachingPoints": [
      "Width: keep a player on each touchline to stretch the defence.",
      "Depth: have a player high to push defenders back and one behind the ball.",
      "Spread out in a diamond or triangle shape around the ball.",
      "Switch play quickly when one side is crowded.",
      "Do not all chase the ball; hold your space."
    ],
    "progressions": [
      "Harder: goals only count if every outfield player is in the opponent's half.",
      "Harder: three-touch maximum in the central area.",
      "Easier: let wide players stay in channels unopposed."
    ]
  },
  "drill-083": {
    "setup": "Use a goal and penalty area, with cones marking the corner arc, a free-kick spot and a throw-in line. Attacking and defending groups of seven to nine in bibs.",
    "steps": [
      "Walk through each set piece slowly so everyone knows their job.",
      "Run five corners with defenders passive, then five live.",
      "Practise two free-kick routines from wide and central positions.",
      "Practise long and short throw-ins from the cone line.",
      "Swap attacking and defending groups halfway through."
    ],
    "coachingPoints": [
      "Every player knows their starting spot before the ball is taken.",
      "Delivery should be driven to the near post or whipped to the penalty spot.",
      "Attackers time a late run into space, not stand still.",
      "Defenders: watch the ball and your player, and attack the ball first.",
      "After the delivery, reset shape quickly for the second ball."
    ],
    "progressions": [
      "Harder: defenders choose zonal or man-marking without telling attackers.",
      "Harder: the defending team counter-attacks if they win the ball.",
      "Easier: keep defenders passive while routines are learned."
    ]
  },
  "drill-084": {
    "setup": "Use a full pitch with goals and goalkeepers at both ends. Two teams of eight to eleven, with the pressing team in bibs and a line of cones marking the opposition's defensive third.",
    "steps": [
      "Goalkeeper on the building team starts play with a pass out.",
      "Pressing team waits in shape until a trigger, then presses together.",
      "Triggers: a pass to a full-back, a backward pass, or a poor touch.",
      "Pressers score double if they win the ball in the defensive third and score.",
      "Rest 2 minutes after every 5 minutes; swap roles halfway."
    ],
    "coachingPoints": [
      "Curve your run to cut off the pass back into the middle.",
      "Press together; one player pressing alone is easy to beat.",
      "Squeeze up behind the press so the gaps stay small.",
      "Win the ball, then attack the goal straight away.",
      "If the press is beaten, everyone sprints back goal-side."
    ],
    "progressions": [
      "Harder: building team gets an extra player to create an overload.",
      "Harder: pressing team must win the ball within 8 seconds or drop off.",
      "Easier: building team is limited to two touches."
    ]
  },
  "drill-085": {
    "setup": "Use a full pitch with goals and goalkeepers. One team lines up in the chosen formation, such as 4-4-2 or 4-3-3, against an opposition team of nine to eleven.",
    "steps": [
      "Walk through the formation with the ball held by the coach.",
      "Coach moves the ball around and players shift into the right positions.",
      "Play a phase of play: attack from the goalkeeper against the opposition.",
      "Stop play to correct positions, then restart.",
      "Finish with a 10-minute match in the formation."
    ],
    "coachingPoints": [
      "Know your role in and out of possession before you start.",
      "Keep distances: about 10 to 15 m between team-mates.",
      "Check your position against the ball, your team-mates and the opposition.",
      "Full-backs and wide players communicate on who goes forward.",
      "Hold your shape when you lose the ball, then recover quickly."
    ],
    "progressions": [
      "Harder: switch formations mid-game on the coach's call.",
      "Harder: opposition uses a different formation to create problems.",
      "Easier: shadow play with no opposition until positions are understood."
    ]
  },
  "drill-086": {
    "setup": "Mark a start line and a finish line 20 to 30 m apart with cones. Players work in groups of three or four with a recovery jog area behind the start line.",
    "steps": [
      "Warm up first with 5 minutes of jogging and dynamic movements.",
      "Sprint 20 m at near-maximum effort.",
      "Walk back to the start for recovery, at least 30 seconds.",
      "Complete a set of six sprints, then rest for 2 minutes.",
      "Do two or three sets depending on age and fitness."
    ],
    "coachingPoints": [
      "Drive your arms and stay on the balls of your feet.",
      "Lean forward slightly for the first few strides.",
      "Full recovery between sprints so every rep is quality.",
      "Stop and tell the coach if you feel any pain."
    ],
    "progressions": [
      "Harder: add a ball and finish each sprint with a dribble through a gate.",
      "Harder: start from different positions, such as lying down or facing backwards.",
      "Easier: shorten to 15 m and allow longer walking recovery."
    ]
  },
  "drill-087": {
    "setup": "Place cones at 5, 10, 15 and 20 m from a start line. Players work in groups of three or four, one group running at a time.",
    "steps": [
      "Run to the 5 m cone, touch it, and run back.",
      "Run to the 10 m cone and back, then 15 m and 20 m.",
      "Walk around the back of the line to recover while other groups run.",
      "Rest at least 90 seconds between full reps.",
      "Complete three to five full reps depending on age."
    ],
    "coachingPoints": [
      "Lower your hips and plant your outside foot to turn.",
      "Touch the line or cone with your hand to keep turns honest.",
      "Push off strongly after the turn with short, quick steps.",
      "Pace yourself so the last rep is as good as the first.",
      "This is a fitness drill, never a punishment."
    ],
    "progressions": [
      "Harder: dribble a ball through the whole run.",
      "Harder: make it a relay race between groups.",
      "Easier: use only three cones up to 15 m with more rest."
    ]
  },
  "drill-088": {
    "setup": "Lay out one agility ladder per group of four to six, or a line of ten cones 50 cm apart. Players queue at one end with a cone 5 m beyond the far end.",
    "steps": [
      "Walk through each footwork pattern slowly first.",
      "Pattern one: one foot in each square.",
      "Pattern two: two feet in each square.",
      "Pattern three: in-in-out-out sideways movement.",
      "After the ladder, sprint 5 m to the cone and jog back to the queue."
    ],
    "coachingPoints": [
      "Stay on the balls of your feet with quick, light steps.",
      "Keep your head up and look ahead, not at your feet.",
      "Pump your arms in rhythm with your feet.",
      "Get it right first, then get faster."
    ],
    "progressions": [
      "Harder: receive a pass and play it back at the end of the ladder.",
      "Harder: add lateral and backwards patterns.",
      "Easier: use cones further apart and stick to one simple pattern."
    ]
  },
  "drill-089": {
    "setup": "Use the pitch perimeter or a marked loop of about 300 m. Players run in small groups at a similar pace, with a coach watching from the centre.",
    "steps": [
      "Start with 3 minutes of walking and light jogging.",
      "Jog continuously at a steady, comfortable pace.",
      "Keep going for 12 to 15 minutes, younger players less.",
      "Take a drinks break halfway if needed.",
      "Finish with 2 minutes of walking."
    ],
    "coachingPoints": [
      "Run at a pace where you can still talk to a team-mate.",
      "Relax your shoulders and keep your arms loose.",
      "Breathe steadily in through the nose and out through the mouth.",
      "It is not a race; keep a pace you can hold."
    ],
    "progressions": [
      "Harder: add 2 minutes each week as fitness improves.",
      "Harder: run with a ball, dribbling around the loop.",
      "Easier: alternate 2 minutes jogging with 1 minute walking."
    ]
  },
  "drill-090": {
    "setup": "Use the pitch perimeter as a running loop. Players run in groups of four to six, with the coach in the centre using a whistle to change pace.",
    "steps": [
      "Warm up with 3 minutes of easy jogging.",
      "On one whistle, stride out at about 75 per cent pace.",
      "On two whistles, sprint for 10 to 15 seconds.",
      "On three whistles, drop to a walk or easy jog to recover.",
      "Mix the paces for 15 to 18 minutes, then walk to finish."
    ],
    "coachingPoints": [
      "Change pace sharply when you hear the whistle.",
      "Use the slow jogs to recover your breathing.",
      "Keep good running form even when tired.",
      "Stay with your group and encourage each other."
    ],
    "progressions": [
      "Harder: shorten recovery periods or lengthen the sprints.",
      "Harder: run the loop with a ball at your feet.",
      "Easier: use longer walking recovery and fewer sprints."
    ]
  },
  "drill-091": {
    "setup": "Set out low boxes or cones no higher than 30 cm on a flat, non-slip surface. Players work in groups of four, one station per group, with plenty of space between stations.",
    "steps": [
      "Warm up thoroughly with jogging and dynamic stretches first.",
      "Practise landings: jump on the spot and land softly, knees bent.",
      "Jump onto the box or over the cone with two feet, then step down.",
      "Complete 6 jumps, then rest for at least 60 seconds.",
      "Do three sets, adding single-leg hops over cones for older players."
    ],
    "coachingPoints": [
      "Land softly on the balls of your feet, like a cat.",
      "Keep knees in line with toes, never caving inwards.",
      "Swing your arms to help drive upwards.",
      "Quality beats quantity; stop if technique breaks down.",
      "Step down from boxes, do not jump down."
    ],
    "progressions": [
      "Harder: lateral jumps over a line of cones.",
      "Harder: jump and then sprint 5 m on landing.",
      "Easier: use flat cones or a line on the ground, and only two-footed jumps."
    ]
  },
  "drill-092": {
    "setup": "Lay mats in a circle with 2 m between each. Players work in pairs, one exercising and one counting, at five stations.",
    "steps": [
      "Station one: front plank on forearms.",
      "Station two: side plank, each side.",
      "Station three: sit-ups or crunches with knees bent.",
      "Station four: dead bug, opposite arm and leg.",
      "Station five: glute bridge; work 30 seconds at each, rest 30 seconds, move on."
    ],
    "coachingPoints": [
      "Keep your body in a straight line from head to heels in planks.",
      "Breathe steadily; do not hold your breath.",
      "Move slowly and with control, not fast and sloppy.",
      "Keep your lower back flat on the mat during dead bugs."
    ],
    "progressions": [
      "Harder: work for 40 seconds with 20 seconds rest.",
      "Harder: plank with alternate arm or leg lifts.",
      "Easier: knee planks and 20 seconds of work at each station."
    ]
  },
  "drill-093": {
    "setup": "Set up a zig-zag course of six cones, each about 5 m apart. One course per group of four, with players queuing at the first cone.",
    "steps": [
      "Walk the course once to learn the route.",
      "Sprint to each cone, plant and cut sharply to the next.",
      "Jog back to the queue to recover.",
      "On the coach's call, react and turn towards a coloured cone named.",
      "Complete six to eight runs each with at least 30 seconds rest."
    ],
    "coachingPoints": [
      "Drop your hips and take short steps into the turn.",
      "Push off the outside foot to change direction.",
      "Look where you are going next before you turn.",
      "Keep your body low and balanced through each cut."
    ],
    "progressions": [
      "Harder: dribble a ball through the course.",
      "Harder: coach calls random cones to test reactions.",
      "Easier: widen the angles and reduce speed while learning."
    ]
  },
  "drill-094": {
    "setup": "Mark two or three pitches of about 25 x 20 m with small goals. Teams of four or five in bibs, spare balls behind each goal.",
    "steps": [
      "Play 4 v 4 or 5 v 5 with no goalkeepers.",
      "Restart quickly from the goal line with a spare ball after each goal or out-ball.",
      "Play 4-minute games with 2 minutes of rest and drinks.",
      "Rotate opponents between games.",
      "Complete four or five games."
    ],
    "coachingPoints": [
      "Keep moving to help team-mates, even when you are not on the ball.",
      "Win the ball back quickly when you lose it.",
      "Use quick restarts to catch the other team out.",
      "Work hard in the games and recover fully in the rest."
    ],
    "progressions": [
      "Harder: make the pitch bigger to increase running.",
      "Harder: all players must be in the opposition half for a goal to count.",
      "Easier: shorter games of 3 minutes with longer rests."
    ]
  },
  "drill-095": {
    "setup": "Mark two lines of cones 20 m apart on a flat surface. Players line up behind one line with 1 to 2 m between each, with the audio on a speaker.",
    "steps": [
      "Warm up for 5 to 8 minutes before starting the test.",
      "Run to the opposite line before each beep.",
      "Turn and run back, keeping pace as the beeps get faster.",
      "A player who misses the line twice in a row stops and records their level.",
      "Walk gently to cool down once finished."
    ],
    "coachingPoints": [
      "Do not race ahead early; match the beeps exactly.",
      "Turn on the line with one foot, not a wide loop.",
      "Stop when you need to; everyone has a different level.",
      "Use results to track your own progress, not to compare."
    ],
    "progressions": [
      "Harder: retest every 6 to 8 weeks to measure improvement.",
      "Easier: younger players stop at a set level or use a shorter course.",
      "Easier: run in small groups so coaches can record accurately."
    ]
  },
  "drill-096": {
    "setup": "Players stand or sit in a circle on the pitch with an arm's length between each. Coach stands in the middle to lead.",
    "steps": [
      "Stretch the hamstrings: one leg forward, heel down, lean gently.",
      "Stretch the quads: hold your foot behind you, knees together.",
      "Stretch the calves: hands on a partner or wall, back leg straight.",
      "Stretch the hip flexors and groin, kneeling or sitting.",
      "Hold each stretch for 20 to 30 seconds, both sides."
    ],
    "coachingPoints": [
      "Stretch to mild tension, never pain.",
      "Hold still; no bouncing.",
      "Breathe slowly and relax into the stretch.",
      "Stretch both sides evenly."
    ],
    "progressions": [
      "Harder: older players add a second set of the tightest stretches.",
      "Easier: younger players hold for 15 seconds and do fewer stretches."
    ]
  },
  "drill-097": {
    "setup": "Use the edge of the pitch or a loop inside the cones. Players jog together as a group at an easy pace.",
    "steps": [
      "Jog slowly around the pitch for 3 to 4 minutes.",
      "Gradually slow the pace each lap.",
      "Finish with 1 to 2 minutes of walking.",
      "Shake out arms and legs to finish."
    ],
    "coachingPoints": [
      "Jog slowly enough to chat with a team-mate.",
      "Breathe steadily and relax your shoulders.",
      "Let your heart rate come down gradually.",
      "Grab a drink when you finish."
    ],
    "progressions": [
      "Easier: walk instead of jog after a hard session.",
      "Harder: add gentle side-steps and backward jogging for variety."
    ]
  },
  "drill-098": {
    "setup": "Lay out foam rollers on a flat, dry surface with space between each player. Coach demonstrates each area first.",
    "steps": [
      "Roll the calves: sit with the roller under your lower leg and roll slowly.",
      "Roll the hamstrings: roller under the back of your thighs.",
      "Roll the quads: lie face down with the roller under your thighs.",
      "Roll the glutes: sit on the roller and lean to one side.",
      "Spend about 1 minute on each area, both legs."
    ],
    "coachingPoints": [
      "Roll slowly; about one inch per second.",
      "Pause on tight spots for a few seconds, but it should not hurt.",
      "Avoid rolling directly on joints or bones.",
      "Keep breathing and stay relaxed."
    ],
    "progressions": [
      "Harder: roll one leg at a time with the other crossed over for more pressure.",
      "Easier: support more body weight on your hands to reduce pressure."
    ]
  },
  "drill-099": {
    "setup": "Pair players of similar height and size. Each pair finds a space on the pitch, one stretching and one helping.",
    "steps": [
      "Hamstring stretch: lie on your back, partner gently lifts your straight leg.",
      "Quad stretch: stand holding your partner's shoulder for balance.",
      "Back-to-back stretch: link arms and gently lean side to side.",
      "Hold each stretch for 20 to 30 seconds.",
      "Swap roles and repeat."
    ],
    "coachingPoints": [
      "The stretcher is in charge; say 'stop' and your partner stops.",
      "Helpers move slowly and gently, never push hard.",
      "Stretch to mild tension, not pain.",
      "Talk to each other throughout."
    ],
    "progressions": [
      "Harder: older players add a seated groin stretch with gentle partner support.",
      "Easier: younger players do partner-balance stretches only, no assisted pressure."
    ]
  },
  "drill-100": {
    "setup": "Players walk slowly in a large circle around the centre circle. Coach stands in the middle to lead the breathing.",
    "steps": [
      "Walk slowly and relax your arms.",
      "Breathe in through your nose for four steps.",
      "Breathe out slowly through your mouth for six steps.",
      "Repeat for 3 to 4 minutes.",
      "Finish standing still with three deep breaths."
    ],
    "coachingPoints": [
      "Fill your belly when you breathe in, not just your chest.",
      "Breathe out slower than you breathe in.",
      "Relax your shoulders and jaw.",
      "Use this time to think about one thing you did well today."
    ],
    "progressions": [
      "Easier: younger players count to three in and three out.",
      "Harder: add arm raises on the in-breath and lowering on the out-breath."
    ]
  }
};
