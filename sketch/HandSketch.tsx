import dynamic from "next/dynamic";
import p5Types from "p5";
import { MutableRefObject, useRef } from "react";
import { Hand, Keypoint } from "@tensorflow-models/hand-pose-detection";
import { getSmoothedHandpose } from "../lib/getSmoothedHandpose";
import { convertHandToHandpose } from "../lib/converter/convertHandToHandpose";
import { Monitor } from "../components/Monitor";
import { Recorder } from "../components/Recorder";
import { Handpose } from "../@types/global";
import { DisplayHands } from "../lib/DisplayHandsClass";
import { HandposeHistory } from "../lib/HandposeHitsoryClass";
import { SubHandpose } from "../lib/SubHandposeClass";

type Props = {
  handpose: MutableRefObject<Hand[]>;
};
const Sketch = dynamic(import("react-p5"), {
  loading: () => <></>,
  ssr: false,
});

export const HandSketch = ({ handpose }: Props) => {
  const handposeHistory = new HandposeHistory();
  const displayHands = new DisplayHands();
  const subHandposeArray: SubHandpose[] = [];
  const fingerNameList: string[] = [
    "thumb",
    "index",
    "middle",
    "ring",
    "pinky",
  ];

  const debugLog = useRef<{ label: string; value: any }[]>([]);

  const preload = (p5: p5Types) => {};

  const setup = (p5: p5Types, canvasParentRef: Element) => {
    p5.createCanvas(p5.windowWidth, p5.windowHeight).parent(canvasParentRef);
    p5.stroke(220);
    p5.fill(255);
    p5.strokeWeight(10);
    for (let i = 0; i < 5; i++) {
      const indices = [];
      indices.push(0);
      for (let j = 0; j < 4; j++) {
        indices.push(4 * i + j + 1);
      }
      subHandposeArray.push(
        new SubHandpose({
          indices: indices,
          originId: 0,
          position: { x: i * 200, y: 0 },
          name: fingerNameList[i],
        })
      );
    }

    subHandposeArray.forEach((subHandpose, index) => {
      subHandpose.setSequence([
        {
          at: 0,
          style: (p5: p5Types, posArr: Keypoint[]) => {
            p5.push();
            for (let i = 0; i < posArr.length; i++) {
              p5.push();
              p5.strokeWeight(5);
              if (i < posArr.length - 1) {
                p5.line(
                  posArr[i].x,
                  posArr[i].y,
                  posArr[i + 1].x,
                  posArr[i + 1].y
                );
              }
              p5.pop();
              p5.push();
              p5.noStroke();
              p5.circle(posArr[i].x, posArr[i].y, 10);
              p5.pop();
            }
            p5.pop();
          },
        },
        {
          at: 5,
          style: (p5: p5Types, posArr: Keypoint[]) => {
            p5.noFill();
            p5.strokeWeight(5);
            p5.circle(0, 0, posArr[3].y - posArr[0].y);
          },
        },
        {
          at: 9,
          style: (p5: p5Types, posArr: Keypoint[]) => {
            const r = 80;
            const d = posArr[3].y - posArr[1].y;
            p5.push();
            p5.noStroke();
            if (r < Math.abs(d)) {
              //none;
            } else if (d > 0) {
              //none;
            } else {
              p5.beginShape();
              p5.vertex(0, 0);
              p5.vertex(Math.sqrt(r ** 2 - d ** 2) / 2, d / 2);
              p5.vertex(0, d);
              p5.vertex(-Math.sqrt(r ** 2 - d ** 2) / 2, d / 2);
              p5.endShape(p5.CLOSE);
            }
            p5.pop();
          },
        },
        {
          at: 12,
          style: (p5: p5Types, posArr: Keypoint[]) => {
            p5.push();
            const lineLength = 50;
            const d = posArr[3].y - posArr[1].y;
            p5.strokeWeight(10);
            const a = Math.min(Math.max(-d / 50, 0), Math.PI / 2);
            for (let index = 0; index < 2; index++) {
              p5.push(); //2
              p5.translate(0, -lineLength * Math.sin(a));
              p5.push(); //3
              p5.rotate((-1) ** index * a);
              p5.line(-lineLength, 0, lineLength, 0);
              p5.pop(); //3
              p5.pop(); //2
            }
            p5.pop();
          },
        },
      ]);
    });
  };

  const draw = (p5: p5Types) => {
    const rawHands: {
      left: Handpose;
      right: Handpose;
    } = convertHandToHandpose(handpose.current);
    handposeHistory.update(rawHands);
    const hands: {
      left: Handpose;
      right: Handpose;
    } = getSmoothedHandpose(rawHands, handposeHistory); //平滑化された手指の動きを取得する

    // logとしてmonitorに表示する
    debugLog.current = [];
    for (const hand of handpose.current) {
      debugLog.current.push({
        label: hand.handedness + " accuracy",
        value: hand.score,
      });
    }

    p5.clear();

    displayHands.update(hands);
    const sec = p5.millis() / 1000;
    for (const subHandpose of subHandposeArray) {
      subHandpose.updatePosition(sec);
    }

    p5.translate(p5.width / 2, p5.height / 2);

    if (displayHands.left.pose.length > 0) {
      p5.push();
      p5.stroke(220, displayHands.left.opacity);
      p5.translate(-400, 0);
      p5.fill(220, displayHands.left.opacity);
      subHandposeArray.forEach((subHandpose, index) => {
        p5.push();
        p5.translate(subHandpose.position.x, subHandpose.position.y);
        const posArr = subHandpose.getKeypoints(displayHands.left.pose);
        subHandpose.style(p5, posArr);
        p5.pop();
      });
      p5.pop();
    }

    if (displayHands.right.pose.length > 0) {
      p5.push();
      p5.stroke(220, displayHands.right.opacity);
      p5.translate(-400, 0);
      p5.fill(220, displayHands.right.opacity);
      subHandposeArray.forEach((subHandpose, index) => {
        p5.push();
        p5.translate(subHandpose.position.x, subHandpose.position.y);
        const posArr = subHandpose.getKeypoints(displayHands.right.pose);
        subHandpose.style(p5, posArr);
        p5.pop();
      });
      p5.pop();
    }
  };

  const windowResized = (p5: p5Types) => {
    p5.resizeCanvas(p5.windowWidth, p5.windowHeight);
  };

  return (
    <>
      <Monitor handpose={handpose} debugLog={debugLog} />
      <Recorder handpose={handpose} />
      <Sketch
        preload={preload}
        setup={setup}
        draw={draw}
        windowResized={windowResized}
      />
    </>
  );
};
