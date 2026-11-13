"""Forced-align a narration file against SCRIPT.md (pocketsphinx), sentence-free, in chunks split at silences.
usage: align_file.py audio.wav out_words.json"""
import json, re, sys, os, subprocess, numpy as np
from pocketsphinx import Decoder, Config, get_model_path
HERE = os.path.dirname(os.path.abspath(__file__))
wav, outp = sys.argv[1], sys.argv[2]
raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', wav, '-ac', '1', '-ar', '16000', '-f', 's16le', '-'], capture_output=True).stdout
pcm = np.frombuffer(raw, np.int16)
script = open(os.path.join(HERE, '../SCRIPT.md')).read().split('## Script\n')[1].strip()
orig = ' '.join(script.split('\n')).split()
SPOKEN = {'2013,': 'twenty thirteen,'}
norm = lambda w: re.sub(r"[^a-z']", '', w.lower())
toks_of = lambda ow: [norm(x) for x in re.split(r'[\s-]+', SPOKEN.get(ow, ow)) if norm(x)]
cfg = Config(hmm=os.path.join(get_model_path(), 'en-us/en-us'), dict=os.path.join(HERE, 'dict.txt'), lm=None, loglevel='FATAL')
dec = Decoder(cfg)
toks = [x for ow in orig for x in toks_of(ow)]
dec.set_align_text(' '.join(toks))
dec.start_utt(); dec.process_raw(pcm.tobytes(), full_utt=True); dec.end_utt()
al = [(re.sub(r'\(\d+\)$', '', s.word), s.start_frame / 100, (s.end_frame + 1) / 100) for s in dec.seg() if s.word not in ('<s>', '</s>', '<sil>', '[NOISE]')]
print('aligned tokens', len(al), 'expected', len(toks), file=sys.stderr)
words, j = [], 0
for ow in orig:
    n = len(toks_of(ow)); ch = al[j:j + n]; j += n
    words.append({'w': ow, 's': round(ch[0][1], 3), 'e': round(ch[-1][2], 3)})
json.dump(words, open(outp, 'w'), indent=0)
print(' '.join(f"{w['w']}@{round(w['s']*30)}" for w in words))
