import json,sys,datetime,calendar,decimal

def run(payload):
 f=payload['facts']; c=payload['constants']; today=datetime.date.fromisoformat(payload.get('today',datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=5,minutes=30))).date().isoformat()))
 def rule(value,basis,source='act',confidence='high'):
  return dict(value=value,basis=basis,source_note=c['sources'][source],confidence=confidence)
 def money(v):
  if v is None:return None
  n=decimal.Decimal(str(v))
  if not n.is_finite() or n<0:raise ValueError('Invalid amount')
  return n
 def forum(v):
  if v is None:return None
  return 'District' if v<=c['districtMax'] else 'State' if v<=c['stateMax'] else 'National'
 amount=money(f.get('amountPaidInr')); compensation=money(f.get('compensationSoughtInr'))
 alternate=amount+compensation if amount is not None and compensation is not None else None
 deadline=None; remaining=None; expired=None
 try:
  date=datetime.date.fromisoformat(f.get('causeOfActionDate') or '')
  year=date.year+c['limitationYears']; deadline=date.replace(year=year,day=min(date.day,calendar.monthrange(year,date.month)[1]))
  remaining=(deadline-today).days;expired=remaining<0
 except (ValueError,TypeError):pass
 eligible=f.get('purpose') not in ('commercial','resale')
 fee=None;confidence='high'
 if amount is not None:
  if amount>2000000 and amount<=5000000:fee={'min':500,'max':1000};confidence='low'
  else:
   selected=next((v for cap,v in c['feeBands'] if amount<=cap),7500);fee={'min':selected,'max':selected}
 party=f.get('oppositeParty',{}).get('type','other')
 return dict(eligibility=rule(eligible,'Section 2(7): commercial/resale excluded; self-employment livelihood exception included. Purpose requires factual review.'),limitation=rule({'deadline':deadline.isoformat() if deadline else None,'daysRemaining':remaining,'expired':expired},'Section 69: two calendar years from stated cause of action. Delay condonation requires sufficient cause; recurring causes and date computation need advocate review.',confidence='high' if deadline else 'low'),claimA=rule(float(amount) if amount is not None else None,'Consideration actually paid; primary jurisdiction basis.','jurisdiction'),claimB=rule(float(alternate) if alternate is not None else None,'Comparison only: paid plus requested compensation. Interest omitted because no rate or period was supplied. This is not the governing jurisdiction test.','jurisdiction','low'),forum=rule(forum(amount),'2021 jurisdiction rules, effective 30 December 2021. District <= 50 lakh; State <= 2 crore; National above.','jurisdiction'),alternateForum=rule(forum(alternate),'Non-primary guide comparison; excludes unspecified interest.','jurisdiction','low'),forumConflict=rule(forum(amount)!=forum(alternate) if alternate is not None else False,'Compare primary and alternate basis.','jurisdiction'),fee=rule(fee,'INR; above 20–50 lakh a reported 500/1000 conflict requires registry confirmation. Higher bands use published fee schedule; confirm before filing.','fees',confidence),feeConflictSource=c['sources']['feeConflict'],territory=rule('Where the complainant resides or personally works for gain; confirm the relevant commission.','Sections 34(2), 47(4), 58 as applicable.'),checklist=rule(c['checks']['common']+c['checks'].get(party,[]),'Practical category checklist; commission may require more.'),asOf=today.isoformat())

if __name__=='__main__':print(json.dumps(run(json.load(sys.stdin))))
