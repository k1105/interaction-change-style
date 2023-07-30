import { Keypoint } from "@tensorflow-models/hand-pose-detection";
import { Handpose } from "../@types/global";
import p5Types from "p5";

type Props = {
  indices: number[];
  originId: number;
  rotation?: number;
  position?: Keypoint;
  name?: string;
};

export class SubHandpose {
  indices: number[];
  originId: number;
  rotation: number;
  position: Keypoint;
  style: (p5: p5Types, posArr: Keypoint[]) => void;
  scale: number;
  name: string;
  sequence: { at: number; style: (p5: p5Types, posArr: Keypoint[]) => void }[];
  nextKeyframeId: number;
  constructor({
    indices,
    originId,
    rotation = 0,
    position = { x: 0, y: 0 },
    name = "noname",
  }: Props) {
    this.indices = indices;
    this.rotation = rotation;
    this.position = position;
    this.originId = originId;
    this.name = name;
    this.nextKeyframeId = 1;
    this.sequence = [];
    this.scale = 1;
    this.style = (p5: p5Types, posArr: Keypoint[]) => {};
  }

  getKeypoints(handpose: Handpose) {
    const res: Keypoint[] = [];
    for (const id of this.indices) {
      res.push({
        x: this.scale * (handpose[id].x - handpose[this.originId].x),
        y: this.scale * (handpose[id].y - handpose[this.originId].y),
      });
    }

    return res;
  }

  setSequence(
    sequence: { at: number; style: (p5: p5Types, posArr: Keypoint[]) => void }[]
  ) {
    this.sequence = sequence;
    this.style = this.sequence[0].style;
  }

  updatePosition(sec: number) {
    const d = 1;
    if (this.nextKeyframeId < this.sequence.length) {
      if (sec >= this.sequence[this.nextKeyframeId].at) {
        this.nextKeyframeId++;
      }
      if (this.nextKeyframeId < this.sequence.length) {
        //更新直後に実行させたくないという理由だけで55行目と同じ判定をしているのが気持ち悪い
        if (this.sequence[this.nextKeyframeId].at - sec < d) {
          let t = sec - this.sequence[this.nextKeyframeId].at + d;
          t /= d / 2;
          if (t < 1) {
            this.scale = 1 - t;
          } else {
            this.style = this.sequence[this.nextKeyframeId].style;
            this.scale = t - 1;
          }
        }
      }
    }
  }
}
