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

const sketch = new p5((p) => {
  // state of our application
  const state = {
    showMessage: true,
    message: 'Loading...'
  }

  p.preload = () => {
    // call into our `database`
    // we are using the Promise syntax instead of async/await here
    // in order to allow the `preload` method to exit and `then` load
    SeedStore.fetchSeeds()
      .then(async results => {
        const paramsString = window.location.search
        const params = new URLSearchParams(paramsString)
        const seed = params.has('seed') ? params.get('seed') : Math.random()

        if(!results.ok) {
          // failed to load DB
          state.showMessage = true
          state.message = 'Fetch not Ok: ' + results.statusText
          sketch.loop()
          return
        }

        const data = await results.json()
        const item = data.seeds.find(s => s.name === seed)

        if(item === undefined) {
          // item does not exist in DB
          state.showMessage = true
          state.message = 'Missing seed key'
          sketch.loop()
          return
        }

        // calc item depth or global default
        const depth = item.depth ?? data.depth

        // init the generator with the seed
        DavidBauMath.seedrandom(item.seed)

        // walk assume start at origin
        state.walk = [[0, 0]]

        // cache values so that we can provide actual pixel values
        // from origin, instead of just offsets from dirMap.  This allows
        // for less computation when rendering the walk (though render
        // implementation may want to scale the walk - step size?)
        let prevX = 0
        let prevY = 0

        for (const _ of range(0, depth)) {
          // given a random direction, select the offset
          const dir = Math.floor(DavidBauMath.random() * 4)
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

        // walk generation is complete
        // blank the screen and stop showing any message
        // call look to trigger render
        sketch.background(sketch.color(200, 200, 200))
        state.showMessage = false
        sketch.loop()
      })
      .catch(e => console.error(e))
  }

  p.setup = () => {
    // we want it all
    sketch.createCanvas(
      sketch.windowWidth,
      sketch.windowHeight)
  }

  p.draw = () => {
    // handle message and noloop out
    if(state.showMessage) {
      sketch.background(sketch.color(42, 42, 42))

      sketch.textSize(25)
      sketch.rectMode('CENTER')
      sketch.textAlign('CENTER', 'CENTER')

      sketch.stroke('white')
      sketch.fill('white')
      // this seems to not do exactly what it sais it supposed to do ... shift left needed
      // subtract half the width of the text, isn't the a rectMode CENTER ?!
      sketch.text(state.message, sketch.width / 2, sketch.height / 2)

      sketch.noLoop()
      return
    }

    // not a good replacement for an actual time based render
    // but frameCount on most system for demo give a good aprox.
    const idx = sketch.frameCount
    if(idx >= state.walk.length) {
      console.log('End of walk')
      sketch.noLoop()
      return
    }


    // lets pick a single item per-frame
    const [ x, y ] = state.walk[idx]
    // we could have just iter the entire walk
    // per frame, or added a per frame animation to
    // each pixel (aka, color shift etc...)
    // state.walk.forEach(([ x, y ]) => {
      sketch.fill('red')
      sketch.stroke('black')
      sketch.ellipse(sketch.width / 2 + x, sketch.height / 2 + y, 1,1)
    // })
    // if we drew all the points, we could stop rending, unless we wanted
    // to animate those points
    //sketch.noLoop()
  }
})
