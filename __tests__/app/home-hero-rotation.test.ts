import { HERO_ROTATION_INTERVAL_MS, startHeroArtRotationInterval } from '../../app/(tabs)/(home)/heroRotation';

describe('home hero rotation interval', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('fires once after 15 seconds and twice after 30 seconds', () => {
    const onRotate = jest.fn();
    const stopRotation = startHeroArtRotationInterval(onRotate);

    jest.advanceTimersByTime(HERO_ROTATION_INTERVAL_MS);
    expect(onRotate).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(HERO_ROTATION_INTERVAL_MS);
    expect(onRotate).toHaveBeenCalledTimes(2);

    stopRotation();
  });

  it('stops firing after the interval is cleared', () => {
    const onRotate = jest.fn();
    const stopRotation = startHeroArtRotationInterval(onRotate);

    jest.advanceTimersByTime(HERO_ROTATION_INTERVAL_MS);
    expect(onRotate).toHaveBeenCalledTimes(1);

    stopRotation();
    jest.advanceTimersByTime(HERO_ROTATION_INTERVAL_MS * 2);

    expect(onRotate).toHaveBeenCalledTimes(1);
  });
});
