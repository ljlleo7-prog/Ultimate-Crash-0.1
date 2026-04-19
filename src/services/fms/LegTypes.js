export const LEG_TYPES = {
  WAYPOINT: 'waypoint',
  AIRPORT: 'airport',
  RUNWAY: 'runway',
  DISCONTINUITY: 'discontinuity',
  MANUAL: 'manual'
};

export const isDiscontinuityLeg = (leg) => leg?.type === LEG_TYPES.DISCONTINUITY;
