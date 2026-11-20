const smileFrames = Object.freeze([
  {id:'A', frame:90, time:'3.60', name:'Head-back laugh'},
  {id:'B', frame:112, time:'4.48', name:'Facing camera'},
  {id:'C', frame:117, time:'4.68', name:'Starting to turn'},
  {id:'D', frame:125, time:'5.00', name:'At the cut'}
]);
const selectedSmile = smileFrames.find(item => item.id === 'C');
const smileParams = new URLSearchParams(location.search);
function frameFor(id) {
  return smileFrames.find(item => item.id === (id || '').toUpperCase()) || selectedSmile;
}
function stillPath(frame, crop) {
  return 'assets/smiles/' + frame.frame + '-' + crop + '.webp';
}
