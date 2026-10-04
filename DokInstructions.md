# Programming instructions

- Keep folders organized, write meaningful comments when needed
- program like a soft engineer/web developer
- The program is in its earliest phase so be prepared to shift things around
- Write useful commit messages
- Try to avoid merge conflict when I edit on my fork and push to main

### 2026.10.2 Updating moving nature:

We will now add 4 scenes in moving nature module: Wind, Rain, Snow, Sunny. Each module will have its own page. After we click in the moving nature ID card, it will move into the first section: wind (other sections will follow with a button suggesting moving on to next section)

Let's first do a prototype with the Wind section, if we like it we move on to work on other sections.

For each section, I have drew some small illustrations of what the canvas will show and how elements interact: 

![image-20261002162720590](/Users/cjz115/Library/Application Support/typora-user-images/image-20261002162720590.png)

The wind section contain words written on the left side of the watercolor paper: Wind, blow, umbrella, tree, fly; and we are thinking of adding softly, heavily, strongly. 

The canvas would first be blank, with a scene of tree, blue skies, and grass field. And when we speak "the wind blows the tree", the canvas animates a gust of wind blowing onto the tree, the tree showing an expression of (oh no it's blowing in my face-like feeling). Let's first try this and gradually build all other components.

