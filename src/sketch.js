
import * as p5lib from './p5.min.js'
import { DavidBauMath } from './seedrandom.js'
import { SeedStore } from './seedStore.js'

const MS_PER_SEC = 1000
const URL_PARAM_NAME = 'seed'
const DEFAULT_DEPTH = 5000
const DEFAULT_ALGO = 'p5'
const MESSAGE_RATE_MS = 1.5 * MS_PER_SEC
const MESSAGE_FONT_SIZE = 20

function* range(start, end) {
  let x = start
  while(x < end - 1) yield x++
}

function* pseudoRandom(seed) {
  let value = seed
  while(true) {
    value = value * 16807 % 2147483647
    yield value
  }
}

export const sketch = new p5((p) => {

  function generateWalk(seed, depth, algorithm) {
    algorithm.seedrandom(seed)

    const walk = [[0, 0]]
    let prevX = 0
    let prevY = 0

    for (const _ of range(0, depth)) {
      const dirMap = [
        [ 1,  0], // right
        [-1,  0], // left
        [ 0,  1], // up
        [ 0, -1]  // down
      ]
      const dir = Math.trunc(algorithm.random() * dirMap.length)

      prevX = prevX + dirMap[dir][0]
      prevY = prevY + dirMap[dir][1]

      walk.push([prevX, prevY])
    }

    return walk
  }

  async function walkToImage(walk, img, fg, bg) {
    const originX = Math.trunc(img.width / 2)
    const originY = Math.trunc(img.height / 2)

    img.loadPixels()

    const size = img.width * img.height * 4
    for(let i = 0; i < size; i++) {
      img.pixels[i + 0] = bg
      img.pixels[i + 1] = bg
      img.pixels[i + 2] = bg
      img.pixels[i + 3] = 255
    }

    walk.forEach(([ x, y ]) => {
      const ix =  originX + x
      const iy =  originY + y
      if(ix > img.width) { return }
      if(iy > img.height) { return }
      const index = ((ix * 4) + iy * (img.width * 4))

      img.pixels[index + 0] = fg // red
      img.pixels[index + 1] = fg // green
      img.pixels[index + 2] = fg // blue
      img.pixels[index + 3] = 255 // alpha
    })

    img.updatePixels()
  }

  // this api is backwards, instead of mapping our code across the `seedrandom`
  // style api, the function generator should be the interface and the calling
  // code should be rewritten to comply.
  // unfortunately most p5 also implements its api this direction thus making
  // all of this a bit easier this way
  let iter // 🤦🏻‍♂️ this, see above, and also should be curried into the bellow algo object
  const algos = {
    'pseudoRandom': {
      seedrandom: seed => iter = pseudoRandom(seed),
      random: () => iter.next().value / 2147483647 // todo what, like what, a guess at normalizing
    },
    'davidBau': {
      seedrandom: seed => DavidBauMath.seedrandom(seed),
      random: () => DavidBauMath.random()
    },
    'p5': {
      seedrandom: seed => sketch.randomSeed(seed),
      random: () => sketch.random()
    }
  }

  // state of our application
  const state = {
    lastMessageUpdate: -Infinity,
    showStats: true,
    splashBackground: false,
    messages: ['__init__'],
    dotSize: 2,
    startTime: Date.now(),

    gfx: {
      img: {},
      color: {}
    }

    // walk
    // item
  }

  p.preload = () => {
    state.messages = ['Loading 😀', 'Loading 😂']

    state.gfx.color = {
      FULL_WALK_BACKGROUND: sketch.color(220),
      FULL_WALK_PATH: sketch.color(140),
      WALK_PATH: sketch.color('black'),
      WALK_DOT: sketch.color('red'),
      MESSAGE_BACKGROUND: sketch.color(42, 42, 42),
      MESSAGE_TEXT: sketch.color('white')
    }

    // call into our `database`
    // we are using the Promise syntax instead of async/await here
    // in order to allow the `preload` method to exit and `then` load
    SeedStore.fetchSeeds()
      .then(async results => {
        // if it did not go `ok`-proper, then display message and exit
        if(!results.ok) {
          // failed to load DB
          console.error('fetch returned', results.statusText)
          state.messages = ['Fetch not Ok: ' + results.statusText]
          return
        }

        // dip into the `window` api and extract the
        // query parameter desired, `seed` in this case
        const paramsString = window.location.search
        const params = new URLSearchParams(paramsString)
        const name = params.has(URL_PARAM_NAME) ? params.get(URL_PARAM_NAME) : ''

        // tap into hash handler for param selection
        const hashString = window.location.hash
        window.onhashchange = () => console.debug('hash changed', window.location.hash)

        // consume the json
        const data = await results.json()
        const item = data.seeds.find(s => s.name === name)

        if(item === undefined) {
          // item does not exist in DB
          console.error('missing name key in data')
          state.messages = ['Missing key name']
          return
        }

        // extract the `depth` and `algo` for this specific entry
        const seed = item.seed
        const depth = item.depth ?? data.depth ?? DEFAULT_DEPTH
        const algo = item.algo ?? data.algo ?? DEFAULT_ALGO
        const algorithm = algos[algo]

        if(!Number.isInteger(seed)) {
          console.error('seed is not a integer', seed)
          state.messages = ['seed is invalid', seed]
          return
        }

        // generate the walk
        state.walk = generateWalk(seed, depth, algorithm)

        // pre-cache some vars
        const minX = state.walk.reduce((min, cur) => Math.min(cur[0], min), Infinity)
        const maxX = state.walk.reduce((max, cur) => Math.max(cur[0], max), -Infinity)
        const minY = state.walk.reduce((min, cur) => Math.min(cur[1], min), Infinity)
        const maxY = state.walk.reduce((max, cur) => Math.max(cur[1], max), -Infinity)
        const stats = { minX, maxX, minY, maxY }

        // cache item onto state
        state.item = Object.freeze({
          name,
          seed,
          depth,
          algo,
          stats
        })

        state.messages = []
      })
      .then(() => {
        if(state.walk === undefined) { return }

        const img = state.gfx.img.background
        return walkToImage(state.walk, img,
          sketch.red(state.gfx.color.FULL_WALK_PATH),
          sketch.red(state.gfx.color.FULL_WALK_BACKGROUND))
          .then(() => {
            state.splashBackground = true
          })
      })
      .catch(e => {
        console.error(e)
        state.messages = ['Error loading seed', e.message]
      })
  }

  p.setup = () => {
    // we want it all
    sketch.createCanvas(
      sketch.windowWidth,
      sketch.windowHeight)

    state.gfx.img.background = sketch.createImage(sketch.width, sketch.height)
  }

  p.windowResized = () => {
    console.warn('not yet')
    sketch.createCanvas(
      sketch.windowWidth,
      sketch.windowHeight)

    //state.gfx.img.background = sketch.createImage(sketch.width, sketch.height)

    state.splashBackground = true
  }

  p.draw = () => {
    const now = Date.now()

    const originX = Math.trunc(sketch.width / 2)
    const originY = Math.trunc(sketch.height / 2)

    // and empty array indicates we nolonger with to display a message
    const hasMessage = state.messages.length !== 0

    if(hasMessage) {
      const messageDeltaMS = now - state.lastMessageUpdate
      if(messageDeltaMS < MESSAGE_RATE_MS) { return }
      state.lastMessageUpdate = now

      // just pick a random one
      const idx = Math.trunc(messageDeltaMS % state.messages.length)
      const message = state.messages[idx]

      sketch.background(state.gfx.color.MESSAGE_BACKGROUND)

      sketch.textSize(MESSAGE_FONT_SIZE)
      sketch.rectMode('CENTER')
      sketch.textAlign('CENTER', 'CENTER')

      sketch.stroke(state.gfx.color.MESSAGE_TEXT)
      sketch.fill(state.gfx.color.MESSAGE_TEXT)

      sketch.text(message, originX, originY)

      return
    }

    if(state.splashBackground) {
      state.splashBackground = false

      const img = state.gfx.img.background
      sketch.image(img, 0, 0, sketch.width, sketch.height)
    }

    // not a good replacement for an actual time based render
    // but frameCount on most system for demo give a good aprox.
    // also, because we now loop for all draws, the start `frameCount`
    // used here may be offset quite alot from zero
    const idx = sketch.frameCount
    if(idx >= state.walk.length) {
      console.debug('End of walk')
      sketch.noLoop()
      return
    }

    // given our above shifted frameCount, get next and prev
    // lets pick a single item per-frame
    const [ x, y ] = state.walk[idx]
    const [ px, py ] = state.walk[idx - 1]

    sketch.stroke(state.gfx.color.WALK_PATH)
    sketch.fill(state.gfx.color.WALK_PATH)
    sketch.ellipse(originX + px, originY + py, state.dotSize, state.dotSize)

    if(originX + px > sketch.width) { return }
    if(originY + py > sketch.height) {  return }

    sketch.noStroke()
    sketch.fill(state.gfx.color.WALK_DOT)
    sketch.ellipse(originX + x, originY + y, state.dotSize, state.dotSize)

    if(state.showStats) {
      sketch.noStroke()

      sketch.fill('black')
      sketch.rect(0, 0, sketch.width, 20)

      sketch.fill('white')
      sketch.textSize(12)

      sketch.text('⚡️' + Math.trunc(sketch.frameRate()) + ' fps', 15, 15)
      sketch.text(Math.trunc((now - state.startTime) / MS_PER_SEC) + ' ⏱', 100, 15)

      sketch.textSize(9)
      sketch.text(JSON.stringify(state.item), 160, 13)
    }
  }
})
