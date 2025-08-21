$(document).ready(function(){
    JsBarcode("#barcode", "{{ eventData.barcode }} ", {
      format: "CODE128",
      width: 1,
      height:40,
      margin: 5,
      textMargin: 0,
      fontSize: 10,
      displayValue: true
    });

  });


//window.print();

//setTimeout(function(){ window.close(); }, 500);