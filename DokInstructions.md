# Programming instructions

- Keep folders organized, write meaningful comments when needed
- program like a soft engineer/web developer
- The program is in its earliest phase so be prepared to shift things around
- Write useful commit messages
- Try to avoid merge conflict when I edit on my fork and push to main
- New sentence does not necessarily erase what's previous. (saying umbrella does not mean the existing puddle disappear.)

### 2026.10.2 Updating moving nature:

We will now add 4 scenes in moving nature module: Wind, Rain, Snow, Sunny. Each module will have its own page. After we click in the moving nature ID card, it will move into the first section: wind (other sections will follow with a button suggesting moving on to next section)

Let's first do a prototype with the Wind section, if we like it we move on to work on other sections.

For each section, I have drew some small illustrations of what the canvas will show and how elements interact: 

The wind section contain words written on the left side of the watercolor paper: Wind, blow, umbrella, tree, fly; and we are thinking of adding softly, heavily, strongly. 

The canvas would first be blank, with a scene of tree, blue skies, and grass field. And when we speak "the wind blows the tree", the canvas animates a gust of wind blowing onto the tree, the tree showing an expression of (oh no it's blowing in my face-like feeling). Let's first try this and gradually build all other components.

### 2026.10.4 Update moving nature 

Update moving nature with similar modules as the first chapter:

* Instead of explicitly hinting 'the wind blows the tree', make the UI card universal. Maybe ask the child to "Make a silly recipe", with the mic beside. In the future they can input different sentences.

* Add the "words played section", when they used a new word, add one to the progress. This is to encourage them to play with all the words

  Remove the "oh no..." description, make the tree's leaves juggle, but not the stem. 

* Replace 'watercolor field' with canvas

* Instead of showing the word with Chinese meanings, remove the chinese meanings and add the type of word beside (e.g. wind  noun) Consider showing the word type in colored tags (e.g. nouns are in light blue backgrounded tags)

#### 10.4 2.0 

Still remove the "oh no, the wind is blowing in my face" statement when playing the animation

* Remove 'Play the scene' button, as the child trigger the animation with their audio input
* According to the other pictures I drew at the very first watercolor drawings, add other animations, ask me when unsure. Ultimately all combinations of using these words could make an animation.
* Allow single sentence or phrases, for example, when say 'the /noun/', the noun appears with a little jiggle or just jiggles if it's in the canvas already.
* Keep the animation's play scene, so it doesn't return to original canvas automatically. Unless it's being overridden by new canvas drawings. 

### 10.4 3.0

Now let's update more details

* Add new animations according to what I drew. For example "the wind blows the umbrella" would show the wind blowing the umbrella and the umbrella swirls round and round looking dizzy. 
* When we say the wind blows softly, show animation with gentle wind (tree leave jiggle softly), 'the wind blows strongly', heavier wind; 'the wind blows heavily', the wind blows more and gradually forming a tornado
* If the child say 'the tree flies' when there is no tornado, the tree grows wings and fly up out side the screen (saying 'the tree' would bring the tree back)
* if the child say 'the tree flies' when there is a tornado, the tornado would move to the tree and pull it up and blow it into the sky.
* When we say "the /noun/ blows the /noun/ (adv)", make animation showing the /noun/ puffs air and blow, for example, the umbrella and tree would have cute facial expressions showing them blowing wind (to the other noun if mentioned)
* ![](/Users/cjz115/Library/Application Support/typora-user-images/image-20261002162720590.png)

### 10.4 4.0

![image-20261004103433423](/Users/cjz115/Library/Application Support/typora-user-images/image-20261004103433423.png)

![image-20261004103513790](/Users/cjz115/Library/Application Support/typora-user-images/image-20261004103513790.png)

The tornado does not look nice... and it does not pull up the tree, please refer to how people usually draw tornados, and the tree was very affected by the tornado. 

* Instead of clicking-listening-times up; now the click of mic button turns on mic and another click stops it, so the child can say anything anytime if they want.

* ![image-20261004103715972](/Users/cjz115/Library/Application Support/typora-user-images/image-20261004103715972.png)

  The current 'umbrella blows the tree' and 'tree blows the umbrella' look the same. The umbrella only spins when its the one being blowed (either the wind or the tree blows it)

* See how characters blow air? they have a mouth that goes 'whooo', and the wind/air blows to the front. Currently you are not showing the direction of wind is blown from umbrella to tree or vise versa, they look the same.![image-20261004103938770](/Users/cjz115/Library/Application Support/typora-user-images/image-20261004103938770.png)

* The difference between softly and strongly does not look different. make the soft softer (the tree enjoying the breeze), the the strong stronger (the tree leaves wiggles more)

* The 'umbrella flies' or 'tree flies' does not create animations of them flying. for now, create wings for them and fly out of the canvas when they are told to fly

* When tornado pulls up the tree, the tree swirls in the tornado and fly out of the canvas. 

### 10.4 5.0

* Can the audio input recognize different sentences? For now if I say 'the wind blows heavily' then 'the wind blows softly', it won't change the wind from heavy to soft, because it picked up both heavily and softly without realizing I want what's most recently said to override previous condition.
* The puff of air from 'umbrella blows the wind' does not show direction as the 'tree blows the umbrella', instead it seems to jump vertically. So make the direction clear
* Make the animation faces look more cheerful (top) rather than upset(bottom right). When blown, show the expression of surprise (bottom left)
* ![image-20261004105330226](/Users/cjz115/Library/Application Support/typora-user-images/image-20261004105330226.png

### 10.4 6.0

* Add another ID card at the right side of the canvas, showing "what I just heard..." and prints the sentence the user said and being picked up from the mic
* Add 'clear canvas' and 'previous scene' buttons. The clear canvas would make the canvas back to default scene (the tree, sky, land...); the 'previous scene' would retreat what was just created from the previous sentence.
* If the user mentioned the 'umbrella', and then 'the wind blows', the umbrella would stay in the image as a component instead of being cleared.  
* The soft wind would make the umbrella jiggle a little (no spinning), the strong wind would blow the umbrella to flip over. The heavy wind would make the umbrella flip over and spin
* The default type of wind blown from umbrella or tree is soft. So when "the tree blows the umbrella", the umbrella jiggles; but when 'the tree blows the umbrella strongly, the umbrella flips', 'the tree blows the umbrella heavily,the umbrella flip and swirls'
* The umbrella blows the tree, default is soft, the umbrella blows the tree strongly, the tree leaves jiggles more, the umbrella blows the tree heavily, the tree jiggles more, with some leaves blown off, but not enough to form a tornado because the umbrella is too light to blow that heavy. 
* Currently it's picking up recipe, so when I say 'the wind blows the umbrella heavily', it forms the animation of 'the wind blows heavily', with the umbrella spinning beside. Pay attention to the meaning of sentence and who does what.

### 10.4 7.0

![image-20261004112116537](/Users/cjz115/Library/Application Support/typora-user-images/image-20261004112116537.png)

When the tree blows the umbrella, the tree's mouth goes 'whooo', but when umbrella blows the tree, it does not 'whooo', so update that when umbrella is the one blowing

* When I say the 'umbrella flips', it. looks like this: instead of actually flipping upside down. Because the wind is too strong and the shape of the umbrella can't hold that much wind, it bends in the opposite direction. Please search up what flipped umbrella looks like and try to draw a flipped version of our umbrella. Remember when our umbrella is flipped due to strong wind, it also jiggles a bit. ![image-20261004110919760](/Users/cjz115/Library/Application Support/typora-user-images/image-20261004110919760.png)
* Make the 'umbrella blows the tree heavily' showing the tree falling out green leaves to the right side (direction of the wind) more clearly
* Now when I say 'the wind blows heavily', and then 'the tree files', the tree flies with wings instead of being pulled by tornado. Make sure when we have heavy wind, the tree and umbrella 'flies' by being pulled by tornado and swirl with it (we achieved this with the tree in the previous version but now we lost it)

### 10.4 8.0

* Rearrange the word sequence in word garden so words of same type is close together, and arrange softly, strongly, heavily in sequence of strength
* when we say 'the umbrella flies' when the tornado is generated, the tornado moves to the umbrella and swirls up, no wings needed. 

### 10.4 Rain section1.0

![image-20261004153308807](/Users/cjz115/Library/Application Support/typora-user-images/image-20261004153308807.png)

Next up for the rain section, please refer to this picture for words we want (Rain, fall, splash, umbrella, tree, puddle). Follow the convention of word garden and canvas. 

* We can also add adverbs used 

  "The rain falls": showing soft raining scene

  "It's raining softly/heavily" shows different rainy scenes. softly-drizzle (sky a bit grey), heavily-strong, fast, big rain drops (sky darker grey).

* When it rains for several seconds, a puddle appears on the ground. 

* saying "a puddle" makes the newly formed puddle show a little ripple on the surface

* "The rain falls onto the umbrella/tree" shows rain drizzle on the object (the object shows a smily face), but if "the rain splashes onto the umbrella/tree," we see large raindrops hitting the object (the object shows a surprised face)

* Alice is a prototype of the character the child will create, right now you can simply draw a stick-man figure to represent its moves. 

* Alice jumps into the puddle: shows the action of alice (originally standing beside the puddle), turns to face the puddle and jumps into it, once she does that, the puddle creates a smashing water effect, and a splashed looking cartoon bubble shows beside the puddle and says "Splash!" in the middle. 

* When Alice is standing in the rain, she looks sad

* When Alice and the umbrella co-occur on canvas, Alice would fetch and hold the umbrella to protect herself from the rain. 

* "Alice falls" would show Alice falling on her butt, getting dirty on her clothes, and she look sad, then get up to standing position.
