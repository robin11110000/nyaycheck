import json,sys,statistics,decimal

def run(p):
 orders=[o for o in p['orders'] if o.get('verified') is True]; n=len(orders)
 counts={k:sum(o['outcome']==k for o in orders) for k in ['allowed','partly_allowed','dismissed','unclear']}
 comp=[decimal.Decimal(str(o['compensation'])) for o in orders if o.get('compensation') is not None]
 totals=[sum(decimal.Decimal(str(o[k])) for k in ['refund','compensation','costs']) for o in orders if all(o.get(k) is not None for k in ['refund','compensation','costs'])]
 refunds=[o for o in orders if o.get('refund') is not None]
 claim=p.get('claim');ratios=[float(t/decimal.Decimal(str(claim))) for t in totals] if claim and claim>0 else []
 return dict(n=n,counts=counts,insufficient_data=n<3,refundKnownN=len(refunds),refundGrantedRate=sum(o['refund']>0 for o in refunds)/len(refunds) if refunds else None,compensationN=len(comp),compensationMin=float(min(comp)) if comp else None,compensationMedian=float(statistics.median(comp)) if n>=3 and len(comp)>=3 else None,compensationMax=float(max(comp)) if comp else None,totalAwardRange=[float(min(totals)),float(max(totals))] if totals else None,awardToClaimRange=[min(ratios),max(ratios)] if ratios else None,note='Descriptive sample only. Missing values are excluded, never treated as zero. Interest excluded. Not a prediction.')

if __name__=='__main__':print(json.dumps(run(json.load(sys.stdin))))
