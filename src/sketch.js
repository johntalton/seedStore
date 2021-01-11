import * as p5lib from './p5.min.js'
import { DavidBauMath } from './seedrandom.js'
import { SeedStore } from './seedStore.js'

function* range(start, end) {
  let x = start
  while(x < end - 1) yield x++
}

function* pseudoRandom(seed) {
  let value = seed;

  while(true) {
    value = value * 16807 % 2147483647
    yield value;
  }
}


export const sketch = new p5((p) => {
  // this api is backwards, instead of mapping our code across the `seedrandom`
  // style api, the function generator should be the interface and the calling
  // code should be rewritten to comply.
  // unfortunatly most p5 also implements its api this direction thus making
  // all of this a bit easyer this way
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
    dotSize: 1,
    startTime: Date.now(),
    imageCache: {}

  }

  p.preload = () => {
    state.messages = ['Loading 😀', 'Loading 😂']
    // call into our `database`
    // we are using the Promise syntax instead of async/await here
    // in order to allow the `preload` method to exit and `then` load
    SeedStore.fetchSeeds()
      .then(async results => {
        // if it did not go `ok`-proper, then display message and exit
        if(!results.ok) {
          // failed to load DB
          state.messages = ['Fetch not Ok: ' + results.statusText]
          return
        }

        // dip into the `window` api and extract the
        // query parameter desired, `seed` in this case
        const paramsString = window.location.search
        const params = new URLSearchParams(paramsString)
        const name = params.has('seed') ? params.get('seed') : Math.random()


        const data = await results.json()
        const item = data.seeds.find(s => s.name === name)

        if(item === undefined) {
          // item does not exist in DB
          console.error('missing name key in data')
          state.messages = ['Missing key name']
          return
        }

        // extract the `depth` and `algo` for this specific entry
        const depth = item.depth ?? data.depth
        const algo = item.algo ?? 'p5'
        const algorithm = algos[algo]
        const seed = item.seed

        if(!Number.isInteger(seed)) {
          state.messages = ['seed is invalid', seed]
          return
        }

        // cache item onto state
        state.item = Object.freeze({
          name,
          seed,
          depth,
          algo
        })


        // init the generator with the seed
        algorithm.seedrandom(item.seed)

        // walk assume start at origin
        state.walk = [[0, 0]]

        // cache values so that we can provide actual pixel values
        // from origin, instead of just offsets from dirMap.  This allows
        // for less computation when rendering the walk (though render
        // implementation may want to scale the walk - step size?)
        let prevX = 0
        let prevY = 0

        console.log('begin walk generation')
        for (const _ of range(0, depth)) {
          // given a random direction, select the offset
          const dir = Math.trunc(algorithm.random() * 4)
          const dirMap = {
            0: [ 1,  0], // right
            1: [-1,  0], // left
            2: [ 0,  1], // up
            3: [ 0, -1]  // down
          }

          // update values
          prevX = prevX + dirMap[dir][0]
          prevY = prevY + dirMap[dir][1]

          // push into walk list as x/y tuple
          state.walk.push([prevX, prevY])
        }
        console.log('end walk generation')

        // pre-cache some vars
        const minX = state.walk.reduce((min, cur) => Math.min(cur, min), -Infinity)
        console.log()

        state.messages = []

      })
      .then(() => {

        // todo move out into a promise that can be forgoten by others
        const img = state.imageCache['background']

        const originX = Math.trunc(img.width / 2)
        const originY = Math.trunc(img.height / 2)

        img.loadPixels()
        console.log('loaing pixels into image', state.walk.length, originX, originY)

        const size = img.width * img.height * 4
        for(let i = 0; i < size; i++) { img.pixels[i] = 220  }

        state.walk.forEach(([ x, y ]) => {
          // todo map display xy to image scale ... 1:1 for now

          const ix =  originX + x
          const iy =  originY + y
          if(ix > img.width) { return }
          if(iy > img.height) { return }
          const index = ((ix * 4) + iy * (img.width * 4))

          img.pixels[index] = 140 // red
          img.pixels[index + 1] = 140 // green
          img.pixels[index + 2] = 140 // blue
          img.pixels[index + 3] = 2555 // alpha
        })

        img.updatePixels()

        console.log('background loaded, splash')
        state.splashBackground = true
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

    state.imageCache['background'] = sketch.createImage(sketch.width, sketch.height)
  }

  p.windowResized = () => {
    console.log('windowResized? net yet')

    sketch.createCanvas(
      sketch.windowWidth,
      sketch.windowHeight)

    state.splashBackground = true
  }

  p.draw = () => {
    const now = Date.now()

    const originX = Math.trunc(sketch.width / 2)
    const originY = Math.trunc(sketch.height / 2)

    const hasMessage = state.messages.length !== 0

    if(hasMessage) {
      // redisplay every secondish
      const messageDeltaMS = now - state.lastMessageUpdate
      if(messageDeltaMS < (1.5 * 1000)) { return }
      state.lastMessageUpdate = now

      // just pick a random one
      const idx = Math.trunc(messageDeltaMS % state.messages.length)
      const message = state.messages[idx]

      sketch.background(sketch.color(42, 42, 42))

      sketch.textSize(20)
      sketch.rectMode('CENTER')
      sketch.textAlign('CENTER', 'CENTER')

      sketch.stroke('white')
      sketch.fill('white')

      // this seems to not do exactly what it sais it supposed to do ... shift left needed
      // subtract half the width of the text, isn't the a rectMode CENTER ?!
      sketch.text(message, originX, originY)

      return
    }

    if(state.splashBackground) {
      console.log('splash background')
      state.splashBackground = false

      const img = state.imageCache['background']
      sketch.image(img, 0, 0, sketch.width, sketch.height)
    }

    // not a good replacement for an actual time based render
    // but frameCount on most system for demo give a good aprox.
    // also, because we now loop for all draws, the start `frameCount`
    // used here may be offset quite alot from zero
    const idx = sketch.frameCount
    if(idx >= state.walk.length) {
      console.log('End of walk')
      sketch.noLoop()
      return
    }

    // given our above shifted frameCount, get next and prev
    // lets pick a single item per-frame
    const [ x, y ] = state.walk[idx]
    const [ px, py ] = state.walk[idx - 1]

    sketch.stroke('black')
    sketch.fill('black')
    sketch.ellipse(originX + px, originY + py, state.dotSize, state.dotSize)

    if(originX + px > sketch.width) { return }
    if(originY + py > sketch.height) {  return }

    sketch.noStroke()
    sketch.fill('red')
    sketch.ellipse(originX + x, originY + y, state.dotSize, state.dotSize)

    if(state.showStats) {
      sketch.noStroke()

      sketch.fill('black')
      sketch.rect(0, 0, sketch.width, 20)

      sketch.fill('white')
      sketch.textSize(12)

      sketch.text('⚡️' + Math.trunc(sketch.frameRate()) + ' fps', 15, 15)
      sketch.text(Math.trunc((now - state.startTime) / 1000) + ' ⏱', 100, 15)

      sketch.textSize(9)
      sketch.text(JSON.stringify(state.item), 160, 13)
    }
  }
})
