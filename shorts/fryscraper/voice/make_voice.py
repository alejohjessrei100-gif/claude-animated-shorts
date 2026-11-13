"""Kokoro (bm_george) narration, synthesized per sentence with controlled pauses, then
pocketsphinx forced alignment per sentence -> words.json [{w,s,e}] in seconds."""
import json, re, sys, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
from pocketsphinx import Decoder, Config, get_model_path
import os
HERE = os.path.dirname(os.path.abspath(__file__))
script = open(os.path.join(HERE, '../SCRIPT.md')).read().split('## Script\n')[1].strip()
# split into sentences (keep '?' / '.')
sents = [s.strip() for s in re.split(r'(?<=[.?!])\s+', ' '.join(script.split('\n'))) if s.strip()]
# spoken form for numbers (aligner + tts)
SPOKEN = {'2013,': 'twenty thirteen,'}
k = Kokoro('/home/user/tts/kokoro-v1.0.onnx', '/home/user/tts/voices-v1.0.bin')
SR = 24000
LEAD, GAP, TAIL = 0.3, 0.26, 1.0
PAUSE_AFTER = {0: 0.45, 9: 0.5, 10: 0.55, 11: 0.45, 17: 0.4}  # beats: before 'Luckily', after it, after 'Unluckily'
audio = [np.zeros(int(LEAD * SR), np.float32)]
t = LEAD
words = []
dict_path = os.path.join(get_model_path(), 'en-us/cmudict-en-us.dict')
extra = ['unluckily AH N L AH K AH L IY', 'sunbathers S AH N B EY DH ER Z']
merged = os.path.join(HERE, 'dict.txt')
open(merged, 'w', encoding='utf8').write(open(dict_path, encoding='utf8').read() + '\n'.join(extra) + '\n')
dict_path = merged
cmu = set(l.split()[0] for l in open(dict_path, encoding='utf8') if l.strip())

def norm(w):
    return re.sub(r"[^a-z']", '', w.lower())

for i, s in enumerate(sents):
    spoken = ' '.join(SPOKEN.get(w, w) for w in s.split())
    a, sr = k.create(spoken, 'bm_george', speed=1.27, lang='en-gb')
    assert sr == SR
    # trim silence
    nz = np.where(np.abs(a) > 0.01)[0]
    a = a[max(0, nz[0] - 240): nz[-1] + 480]
    # align
    a16 = np.interp(np.arange(0, len(a), SR / 16000), np.arange(len(a)), a)
    pcm = (np.clip(a16, -1, 1) * 32767).astype(np.int16).tobytes()
    cfg = Config(hmm=os.path.join(get_model_path(), 'en-us/en-us'), dict=dict_path, lm=None, loglevel='FATAL')
    dec = Decoder(cfg)
    def toks_of(ow):
        return [norm(x) for x in re.split(r'[\s-]+', SPOKEN.get(ow, ow)) if norm(x)]
    toks = [x for ow in s.split() for x in toks_of(ow)]
    for w in toks:
        if w not in cmu: print('OOV', w, file=sys.stderr)
    dec.set_align_text(' '.join(toks))
    dec.start_utt(); dec.process_raw(pcm, full_utt=True); dec.end_utt()
    segs = [(seg.word, seg.start_frame / 100, (seg.end_frame + 1) / 100) for seg in dec.seg() if seg.word not in ('<s>', '</s>', '<sil>', '[NOISE]')]
    al = [(re.sub(r'\(\d+\)$', '', w), s0, e0) for w, s0, e0 in segs]
    orig = [w for w in s.split()]
    # map spoken tokens back to original words (2013 -> two tokens)
    j = 0
    for ow in orig:
        n = len(toks_of(ow))
        chunk = al[j:j + n]; j += n
        if not chunk: print('MISS', ow, file=sys.stderr); continue
        words.append({'w': ow, 's': round(t + chunk[0][1], 3), 'e': round(t + chunk[-1][2], 3), 'sent': i})
    if j != len(al): print('ALIGN COUNT MISMATCH', i, j, len(al), file=sys.stderr)
    audio.append(a); t += len(a) / SR
    p = PAUSE_AFTER.get(i, GAP)
    audio.append(np.zeros(int(p * SR), np.float32)); t += p
audio.append(np.zeros(int(TAIL * SR), np.float32)); t += TAIL
full = np.concatenate(audio)
sf.write(os.path.join(HERE, 'voice_24k.wav'), full, SR)
json.dump(words, open(os.path.join(HERE, 'words.json'), 'w'), indent=0)
print('sentences', len(sents), 'words', len(words), 'duration', round(len(full) / SR, 2))
