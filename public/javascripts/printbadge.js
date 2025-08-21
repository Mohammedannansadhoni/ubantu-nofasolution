$(document).ready(function() {
    var eventDataIdForPrint = $('#eventDataIdForPrint').val();
    window.open('/event/print-badge/' + eventDataIdForPrint, '_blank', '');

    var customDataTable = $('#datatable').DataTable( {
        "lengthChange": false,
        "processing": false,
        "serverSide": true,
        "ajax": {
            "url":"/event/getregistration",
            "type":"GET"
            
        },
        "columnDefs": [
            {
                "targets": [ 0 ],
                "visible": false,
                "searchable": false
            }

        ]
      
    } );



    $('#customSearchTextBox').on('keyup', function () {
        customDataTable.search(this.value).draw();
    });

    
    $('#datatable tbody').on( 'click', 'tr', function () {
        if ( $(this).hasClass('selected') ) {
            $(this).removeClass('selected');

            
        }
        else {
            customDataTable.$('tr.selected').removeClass('selected');
            $(this).addClass('selected');

            //var data = customDataTable.row( this ).data();
            //alert( 'You clicked on '+data[0]+'\'s row' );
    

            //console.log($(this).children().eq(0)[0].innerText);
        }
    } );
    
    $('#customDataTableEditRow').click( function () {
        var data = customDataTable.row('.selected').data();
        if(!data){
            alert('Please select a row');
            return;
        }
        window.location='/event/edit-registration/' + data[0];
  

       
    } );

    $('#customDataTablePrintRow').click( function () {
        var data = customDataTable.row('.selected').data();
        if(!data){
            alert('Please select a row');
            return;
        }
        //window.location='/event/print-badge/' + data[0];
        //window.open('/event/print-badge/' + data[0], '_blank', 'toolbar=yes,scrollbars=yes,resizable=yes,top=500,left=500,width=400,height=400');
        window.open('/event/print-badge/' + data[0], '_blank', '');

       
    } );



} );

