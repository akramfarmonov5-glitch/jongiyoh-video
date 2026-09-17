import { BackgroundMusicGenre } from '../types';

interface MusicInstance {
  masterGain: GainNode;
  stop: () => void;
}

export const createBackgroundMusic = (
  ctx: AudioContext,
  genre: BackgroundMusicGenre,
  volumePercent: number = 25
): MusicInstance | null => {
  if (genre === BackgroundMusicGenre.NONE || volumePercent <= 0) {
    return null;
  }

  const masterGain = ctx.createGain();
  // Soft, calming background bed: kept low so human voice is prominent, clear and soothing
  const vol = (volumePercent / 100) * 0.10;
  masterGain.gain.setValueAtTime(vol, ctx.currentTime);

  const activeNodes: (OscillatorNode | GainNode | BiquadFilterNode)[] = [];
  const intervals: number[] = [];

  const now = ctx.currentTime;

  if (genre === BackgroundMusicGenre.NATURE_CALM) {
    // Warm nature harmonic drone & gentle wind-chime harmonics
    const baseOsc = ctx.createOscillator();
    const baseGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, now);

    baseOsc.type = 'sine';
    baseOsc.frequency.setValueAtTime(130.81, now); // C3 warm earth note
    baseGain.gain.setValueAtTime(0.20, now);

    baseOsc.connect(filter);
    filter.connect(baseGain);
    baseGain.connect(masterGain);
    baseOsc.start(now);
    activeNodes.push(baseOsc, baseGain, filter);

    // Pentatonic gentle nature bells
    const bellNotes = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25];
    let noteIdx = 0;

    const playBell = () => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const bFilter = ctx.createBiquadFilter();

      bFilter.type = 'bandpass';
      bFilter.frequency.setValueAtTime(800, ctx.currentTime);
      bFilter.Q.setValueAtTime(3, ctx.currentTime);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(bellNotes[noteIdx % bellNotes.length], ctx.currentTime);
      noteIdx++;

      const t = ctx.currentTime;
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.05, t + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);

      osc.connect(bFilter);
      bFilter.connect(gain);
      gain.connect(masterGain);

      osc.start(t);
      osc.stop(t + 1.3);
      activeNodes.push(osc, gain, bFilter);
    };

    playBell();
    const bellTimer = window.setInterval(playBell, 900);
    intervals.push(bellTimer);

  } else if (genre === BackgroundMusicGenre.MEDITATIVE_NEY) {
    // Sharqona ney / Meditative Eastern Ambient Drone & flute harmonics
    const neyBase = ctx.createOscillator();
    const neyGain = ctx.createGain();
    const neyFilter = ctx.createBiquadFilter();

    neyFilter.type = 'lowpass';
    neyFilter.frequency.setValueAtTime(550, now);

    neyBase.type = 'triangle';
    neyBase.frequency.setValueAtTime(146.83, now); // D3
    neyGain.gain.setValueAtTime(0.18, now);

    neyBase.connect(neyFilter);
    neyFilter.connect(neyGain);
    neyGain.connect(masterGain);
    neyBase.start(now);
    activeNodes.push(neyBase, neyGain, neyFilter);

    // Warm modal progression
    const maqomNotes = [220.00, 246.94, 261.63, 293.66, 329.63];
    let mIdx = 0;

    const playNeyFlow = () => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const f = ctx.createBiquadFilter();

      f.type = 'bandpass';
      f.frequency.setValueAtTime(700, ctx.currentTime);

      o.type = 'sine';
      o.frequency.setValueAtTime(maqomNotes[mIdx % maqomNotes.length], ctx.currentTime);
      mIdx++;

      const t = ctx.currentTime;
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.04, t + 0.3);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);

      o.connect(f);
      f.connect(g);
      g.connect(masterGain);

      o.start(t);
      o.stop(t + 2.0);
      activeNodes.push(o, g, f);
    };

    playNeyFlow();
    const mTimer = window.setInterval(playNeyFlow, 1400);
    intervals.push(mTimer);

  } else if (genre === BackgroundMusicGenre.ORGANIC_WELLNESS) {
    // Acoustic wellness gentle chords
    const chords = [
      [130.81, 196.00, 261.63, 329.63], // C major
      [146.83, 220.00, 261.63, 349.23], // Dm
      [164.81, 246.94, 293.66, 392.00], // Em
      [174.61, 261.63, 349.23, 440.00], // F major
    ];
    let chordIdx = 0;

    const playChord = () => {
      const curChord = chords[chordIdx % chords.length];
      chordIdx++;

      curChord.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(600, ctx.currentTime);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);

        const t = ctx.currentTime + idx * 0.08;
        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(0.035, t + 0.2);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 2.5);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);

        osc.start(t);
        osc.stop(t + 2.8);
        activeNodes.push(osc, gain, filter);
      });
    };

    playChord();
    const chordTimer = window.setInterval(playChord, 2200);
    intervals.push(chordTimer);

  } else if (genre === BackgroundMusicGenre.WARM_HERBAL_LOFI) {
    // Warm soothing lofi vinyl chords
    const lofiNotes = [
      [174.61, 220.00, 261.63, 329.63], // Fmaj7
      [164.81, 196.00, 246.94, 293.66], // Em7
      [146.83, 174.61, 220.00, 261.63], // Dm7
      [130.81, 164.81, 196.00, 246.94], // Cmaj7
    ];
    let lIdx = 0;

    const playLofiChord = () => {
      const curNotes = lofiNotes[lIdx % lofiNotes.length];
      lIdx++;

      curNotes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(500, ctx.currentTime);

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);

        const t = ctx.currentTime + i * 0.04;
        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(0.03, t + 0.15);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);

        osc.start(t);
        osc.stop(t + 2.4);
        activeNodes.push(osc, gain, filter);
      });
    };

    playLofiChord();
    const lofiTimer = window.setInterval(playLofiChord, 2000);
    intervals.push(lofiTimer);
  }

  return {
    masterGain,
    stop: () => {
      intervals.forEach(timer => clearInterval(timer));
      activeNodes.forEach(node => {
        try {
          if ('stop' in node) {
            (node as OscillatorNode).stop();
          }
          node.disconnect();
        } catch (e) {}
      });
      masterGain.disconnect();
    }
  };
};
